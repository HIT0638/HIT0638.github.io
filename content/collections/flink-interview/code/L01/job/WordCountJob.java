package code.L01.job;

import org.apache.flink.api.common.functions.FlatMapFunction;
import org.apache.flink.api.common.typeinfo.Types;
import org.apache.flink.api.java.tuple.Tuple2;
import org.apache.flink.streaming.api.datastream.DataStream;
import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
import org.apache.flink.util.Collector;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * 基础 DataStream 作业 — 覆盖 L01 核心 API（map/flatMap/filter/keyBy/sum）。
 *
 * <h3>Pipeline</h3>
 * <pre>
 *   Socket Text → filter(非空) → flatMap(拆词) → map(转Tuple2) → keyBy(word) → sum(1)
 * </pre>
 *
 * <h3>面试点</h3>
 * <ul>
 *   <li>{@code keyBy()} 触发 shuffle — 这里断了 Operator Chain</li>
 *   <li>{@code returns()} 显式声明类型 — 避免 Kryo fallback</li>
 *   <li>{@code env.execute()} 触发 StreamGraph → JobGraph → ExecutionGraph 编译</li>
 * </ul>
 */
public class WordCountJob {

    private static final Logger LOG = LoggerFactory.getLogger(WordCountJob.class);

    public static void main(String[] args) throws Exception {

        // 1. 创建执行环境
        StreamExecutionEnvironment env =
                StreamExecutionEnvironment.getExecutionEnvironment();
        env.setParallelism(4);
        LOG.info("WordCount Job starting, parallelism=4");

        // 2. Source — 读取 socket（生产替换为 KafkaSource）
        DataStream<String> text = env.socketTextStream("localhost", 9999);

        // 3. Transform：filter → flatMap → map → keyBy → sum
        DataStream<Tuple2<String, Integer>> counts = text
                .filter(line -> line != null && !line.trim().isEmpty())
                .name("filter-empty")
                .flatMap(new Tokenizer())
                .name("tokenizer")
                .returns(String.class)           // 显式声明，避免 Kryo
                .map(word -> Tuple2.of(word, 1))
                .name("to-tuple")
                .returns(Types.TUPLE(Types.STRING, Types.INT))
                .keyBy(t -> t.f0)                // ← 触发 shuffle，断 Chain
                .name("keyby-word")
                .sum(1)                           // ← 按 key 累加（Flink 内置 reduce）
                .name("sum-counts");

        // 4. Sink — 打印（生产替换为 KafkaSink / ClickHouseSink）
        counts.print().name("console-sink");

        // 5. 提交作业 — 触发 StreamGraph→JobGraph→ExecutionGraph 编译
        env.execute("word-count");
    }

    /**
     * 分词 FlatMapFunction。
     * 输入一行文本，输出拆分后的单词。
     */
    public static class Tokenizer implements FlatMapFunction<String, String> {
        @Override
        public void flatMap(String line, Collector<String> out) {
            for (String word : line.toLowerCase().split("\\W+")) {
                if (!word.isEmpty()) {
                    out.collect(word);
                }
            }
        }
    }
}
