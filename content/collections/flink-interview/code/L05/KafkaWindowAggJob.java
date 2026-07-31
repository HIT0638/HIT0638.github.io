import org.apache.flink.api.common.eventtime.*;
import org.apache.flink.api.common.serialization.SimpleStringSchema;
import org.apache.flink.api.common.typeinfo.Types;
import org.apache.flink.api.java.tuple.Tuple2;
import org.apache.flink.connector.kafka.source.KafkaSource;
import org.apache.flink.connector.kafka.source.enumerator.initializer.OffsetsInitializer;
import org.apache.flink.streaming.api.datastream.DataStream;
import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
import org.apache.flink.streaming.api.windowing.assigners.TumblingEventTimeWindows;
import org.apache.flink.streaming.api.windowing.time.Time;

import java.time.Duration;

/**
 * 模板 Job：Kafka -> 事件时间 + Watermark -> 滚动窗口聚合 -> Sink
 * 对应 Day2（窗口/时间）+ Day5（Kafka 集成）+ Day4（Checkpoint/精确一次）
 *
 * 依赖（Flink 1.17+）：
 *   flink-streaming-java, flink-clients, flink-connector-kafka,
 *   flink-json（若用 JSON 反序列化）
 */
public class KafkaWindowAggJob {

    public static void main(String[] args) throws Exception {
        StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();
        env.setParallelism(4);
        env.enableCheckpointing(5000);                 // 周期 Checkpoint（Day4）
        // 精确一次：env.getCheckpointConfig().setCheckpointingMode(CheckpointingMode.EXACTLY_ONCE);

        // 1) Watermark 策略：有界乱序 5s + 空闲分区 1min
        WatermarkStrategy<String> wm = WatermarkStrategy
                .<String>forBoundedOutOfOrderness(Duration.ofSeconds(5))
                .withTimestampAssigner((s, ts) -> extractEventTime(s))   // 从消息取事件时间
                .withIdleness(Duration.ofMinutes(1));

        // 2) Kafka Source（新 API）。并行度建议 = 分区数
        KafkaSource<String> source = KafkaSource.<String>builder()
                .setBootstrapServers("localhost:9092")
                .setTopics("events")
                .setGroupId("flink-agg")
                .setStartingOffsets(OffsetsInitializer.earliest())
                .setValueOnlyDeserializer(new SimpleStringSchema())
                .build();

        DataStream<String> stream = env.fromSource(source, wm, "kafka-events");

        // 3) 解析 + keyBy + 滚动窗口 5min 聚合
        stream.map(KafkaWindowAggJob::parse)                       // Tuple2<userId, 1>
                .returns(Types.TUPLE(Types.STRING, Types.INT))
                .keyBy(t -> t.f0)
                .window(TumblingEventTimeWindows.of(Time.minutes(5)))
                .reduce((a, b) -> Tuple2.of(a.f0, a.f1 + b.f1))    // 增量聚合
                .addSink(new PrintSink<>());                       // 替换为 Kafka/ClickHouse Sink（2PC 精确一次）

        env.execute("kafka-window-agg");
    }

    // ---- 以下为示意辅助方法，按真实消息格式替换 ----
    private static long extractEventTime(String s) {
        // TODO: 从 JSON/CSV 中解析事件时间（毫秒）
        return System.currentTimeMillis();
    }
    private static Tuple2<String, Integer> parse(String s) {
        // TODO: 真实解析
        return Tuple2.of(s, 1);
    }
}
