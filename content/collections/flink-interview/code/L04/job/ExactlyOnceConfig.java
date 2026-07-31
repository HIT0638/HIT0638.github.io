package code.L04.job;

import org.apache.flink.api.common.CheckpointingMode;
import org.apache.flink.api.common.restartstrategy.RestartStrategies;
import org.apache.flink.api.common.time.Time;
import org.apache.flink.connector.kafka.sink.KafkaRecordSerializationSchema;
import org.apache.flink.connector.kafka.sink.KafkaSink;
import org.apache.flink.contrib.streaming.state.EmbeddedRocksDBStateBackend;
import org.apache.flink.streaming.api.environment.CheckpointConfig;
import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Checkpoint / Exactly-once 配置骨架 — 覆盖 L04 核心配置。
 *
 * <h3>面试点</h3>
 * <ul>
 *   <li>Checkpoint 模式：{@code EXACTLY_ONCE}</li>
 *   <li>RocksDB + 增量 Checkpoint（大状态标配）</li>
 *   <li>两阶段提交 Sink：{@code DeliveryGuarantee.EXACTLY_ONCE}</li>
 *   <li>指数退避重启策略</li>
 *   <li>Checkpoint 超时、pause、retain 等生产必备参数</li>
 * </ul>
 *
 * <p>这个文件不是完整的 Job——它展示 <b>生产级 Checkpoint / 2PC 的配置全貌</b>。
 * 你的实际 Job 在创建 {@code StreamExecutionEnvironment} 后照此配置即可。</p>
 */
public class ExactlyOnceConfig {

    private static final Logger LOG = LoggerFactory.getLogger(ExactlyOnceConfig.class);

    public static void main(String[] args) throws Exception {

        StreamExecutionEnvironment env =
                StreamExecutionEnvironment.getExecutionEnvironment();

        // ========== 1. Checkpoint 基础配置 ==========

        // 间隔 60s 一次 Checkpoint
        env.enableCheckpointing(60_000);

        // Exactly-once 模式（默认就是 EXACTLY_ONCE，显式声明更清晰）
        env.getCheckpointConfig().setCheckpointingMode(CheckpointingMode.EXACTLY_ONCE);

        // Checkpoint 超时：1 分钟内必须完成
        env.getCheckpointConfig().setCheckpointTimeout(60_000);

        // 两次 Checkpoint 之间至少间隔 5s（避免背对背 Checkpoint）
        env.getCheckpointConfig().setMinPauseBetweenCheckpoints(5_000);

        // 最多同时进行 1 个 Checkpoint
        env.getCheckpointConfig().setMaxConcurrentCheckpoints(1);

        // 作业取消时保留 Checkpoint（用于外部恢复）
        env.getCheckpointConfig().setExternalizedCheckpointCleanup(
                CheckpointConfig.ExternalizedCheckpointCleanup.RETAIN_ON_CANCELLATION);

        // 容忍 Checkpoint 失败 3 次（防止偶发失败导致作业挂）
        env.getCheckpointConfig().setTolerableCheckpointFailureNumber(3);

        // ========== 2. StateBackend：RocksDB + 增量 ==========

        // 大状态标配
        EmbeddedRocksDBStateBackend backend = new EmbeddedRocksDBStateBackend(true);
        env.setStateBackend(backend);
        // Checkpoint 存储路径（HDFS / S3）
        env.getCheckpointConfig().setCheckpointStorage(
                "hdfs://namenode:8020/flink/checkpoints");

        // ========== 3. Restart Strategy：指数退避 ==========

        env.setRestartStrategy(RestartStrategies.exponentialDelayRestart(
                Time.minutes(1),     // initialBackoff：首次等 1 分钟
                Time.minutes(10),    // maxBackoff：最长等 10 分钟
                1.5,                 // backoffMultiplier：指数系数
                Time.minutes(5),     // resetBackoffThreshold：5 分钟无故障后重置
                0.1                  // jitterFactor：10% 抖动，避免惊群
        ));

        // ========== 4. Sink：Kafka 事务 + 两阶段提交 ==========

        KafkaSink<String> sink = KafkaSink.<String>builder()
                .setBootstrapServers("broker1:9092,broker2:9092")
                .setRecordSerializer(
                        KafkaRecordSerializationSchema.builder()
                                .setTopic("output-topic")
                                .setValueSerializationSchema(
                                        new org.apache.flink.api.common.serialization
                                                .SimpleStringSchema())
                                .build()
                )
                // ★ 开启 Exactly-once 语义（Kafka 事务）
                .setDeliveryGuarantee(
                        org.apache.flink.connector.base.DeliveryGuarantee.EXACTLY_ONCE)
                // ★ 事务 ID 前缀——每个 Job 必须唯一
                .setTransactionalIdPrefix("my-flink-job-")
                .build();

        LOG.info("Exactly-once + 2PC configuration ready");
        LOG.info("Checkpoint interval=60s, StateBackend=RocksDB(incremental), " +
                 "Restart=exponential, Sink=Kafka(EXACTLY_ONCE)");
    }
}
