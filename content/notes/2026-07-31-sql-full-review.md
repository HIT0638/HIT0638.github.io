---
title: 散功重修篇：轰轰烈烈的SQL大复习
date: 2026-07-31
summary: 以 MySQL 8.0 为主，系统梳理 DDL、DML、DQL、窗口函数、事务、索引与高频题型，并标注常见 NULL、JOIN、执行计划和方言差异。
draft: false
---

<!-- # SQL 全面复习：从基础语法到高频题型 -->

_本文以 MySQL 8.0 为主，必要处标注 PostgreSQL 的关键差异。各节按照语法骨架、核心原理、示例和易错点组织。_

本文使用一套小型教学数据模型贯穿示例。组织场景使用 `departments` 和 `employees`，电商场景使用 `customers`、`products`、`orders` 和 `order_items`；登录、事务、时间序列与行列转换场景分别使用文末附录中的配套表结构。

---

## 第 0 章 总纲：SQL 的分类与执行顺序

### SQL 五大分类

| 分类 | 全称 | 关键字 | 说明 |
| --- | --- | --- | --- |
| DDL | Data Definition Language | `CREATE` `ALTER` `DROP` `TRUNCATE` | 定义结构，MySQL 中隐式提交，不可回滚 |
| DML | Data Manipulation Language | `INSERT` `UPDATE` `DELETE` | 操作数据，可回滚 |
| DQL | Data Query Language | `SELECT` | 数据查询的核心语句 |
| DCL | Data Control Language | `GRANT` `REVOKE` | 权限控制 |
| TCL | Transaction Control Language | `COMMIT` `ROLLBACK` `SAVEPOINT` | 事务控制 |

### 子句执行顺序

SQL 的**书写顺序**和**执行顺序**不一样：

```mermaid
flowchart LR
    accTitle: SQL clause execution order
    accDescr: The diagram shows the order in which SQL clauses are evaluated, from FROM through WHERE, GROUP BY, HAVING, SELECT, DISTINCT, ORDER BY, and LIMIT.

    from_clause["FROM / JOIN"] --> where_clause["WHERE"]
    where_clause --> group_by_clause["GROUP BY"]
    group_by_clause --> having_clause["HAVING"]
    having_clause --> select_clause["SELECT"]
    select_clause --> distinct_clause["DISTINCT"]
    distinct_clause --> order_by_clause["ORDER BY"]
    order_by_clause --> limit_clause["LIMIT"]
```

执行顺序带来的三个结论：

1. `WHERE` 不能用聚合函数、不能用 SELECT 里的列别名 —— 它比 `GROUP BY`、`SELECT` 先执行；
2. `HAVING` 能筛选分组但**不能**筛选窗口函数结果 —— 窗口函数在 HAVING 之后才计算；
3. `ORDER BY` 是倒数第二步，所以能用别名、能用窗口函数。

```sql
-- WHERE 阶段不能使用 count(*)
select department_id, count(*) as employee_count
from employees
where status = 'active'
group by department_id
having count(*) > 1; -- 正确：having 用聚合
```

---

## 第 1 章 DDL：建库建表与结构修改

### 库与表

```sql
create database if not exists analytics_lab default character set utf8mb4;
drop database if exists analytics_lab;

create table departments (
    department_id int primary key auto_increment,
    department_name varchar(100) not null,
    parent_department_id int null,
    constraint uk_departments_name unique (department_name),
    constraint fk_departments_parent
        foreign key (parent_department_id)
        references departments(department_id)
);

create table employees (
    employee_id int primary key auto_increment,
    employee_name varchar(100) not null,
    department_id int not null,
    manager_id int null,
    salary decimal(10,2) not null default 0.00,
    commission_rate decimal(5,2) null,
    email varchar(150) null,
    hire_date date not null,
    status varchar(20) not null default 'active',
    constraint fk_employees_department
        foreign key (department_id)
        references departments(department_id),
    constraint fk_employees_manager
        foreign key (manager_id)
        references employees(employee_id)
);
```

### 数据类型速查

| 类别 | 常见类型 | 要点 |
| --- | --- | --- |
| 整数 | `TINYINT` `INT` `BIGINT` | 区分度、范围；`INT` 4 字节 |
| 小数 | `DECIMAL(p,s)` `FLOAT/DOUBLE` | 金额必须 `DECIMAL`，浮点有精度误差 |
| 字符串 | `CHAR(n)` `VARCHAR(n)` `TEXT` | `CHAR` 定长，`VARCHAR` 变长；`utf8mb4` 下 `VARCHAR(n)` 按字符 |
| 时间 | `DATE` `DATETIME` `TIMESTAMP` | `TIMESTAMP` 有 2038 年问题，范围小 |
| 布尔 | `TINYINT(1)` | MySQL 没有原生 `BOOLEAN`（语法糖） |

### CREATE TABLE ... LIKE 与 AS SELECT

```sql
create table employees_copy like employees;
-- 复制表结构 + 继承所有约束、索引、触发器（MySQL）；不复制数据

create table high_salary_employees as
select employee_id, employee_name, department_id, salary
from employees
where salary >= 20000;
-- 复制数据 + 列名/类型；不继承约束、索引、主键（CTAS）
```

> ⚠️ 常见问题：如何同时复制表结构和数据？可以先用 `LIKE` 建立结构，再用 `INSERT SELECT` 复制数据。

### ALTER 常用语法

```sql
-- 以下 ALTER 示例围绕一个临时新增字段展开
alter table employees add column nickname varchar(50) after employee_name;
alter table employees modify column nickname varchar(100) not null;
alter table employees change column nickname preferred_name varchar(100) not null;
alter table employees drop column preferred_name;

-- 索引
alter table employees add index idx_employees_department (department_id);
alter table employees add index idx_employees_department_salary
    (department_id, salary);
alter table employees drop index idx_employees_department;

-- 表名修改示例
create table employee_staging like employees;
alter table employee_staging rename to employee_archive;
rename table employee_archive to employee_history;

-- 约束
alter table employees add constraint uk_employees_email unique (email);
alter table employees drop index uk_employees_email;
alter table accounts drop primary key;
```

### TRUNCATE、DROP 与 DELETE

| 维度 | `TRUNCATE` | `DELETE` | `DROP` |
| --- | --- | --- | --- |
| 类型 | DDL | DML | DDL |
| 删什么 | 全部数据 | 可加 `WHERE` 删部分 | 整个表/库 |
| 回滚 | 不可回滚（MySQL 隐式提交） | 可回滚（配合事务） | 不可回滚 |
| 自增 | 重置 | 不重置 | — |
| 性能 | 快（直接释放页） | 慢（逐行删 + 日志） | 快 |
| 触发器等 | 不触发 | 触发 | 不触发 |

---

## 第 2 章 DML：增删改

```sql
-- 插入：单行 / 多行
insert into departments (department_name, parent_department_id)
values ('数据平台部', null);

insert into departments (department_name, parent_department_id)
values
    ('数据工程组', 1),
    ('数据分析组', 1),
    ('财务部', null);

-- 插入：从查询结果写入另一张表
insert into employees_copy
    (employee_id, employee_name, department_id, salary)
select employee_id, employee_name, department_id, salary
from employees
where salary >= 20000;

-- 更新：SET 中可以引用更新前的列值
update employees
set salary = salary * 1.05
where department_id = 2 and status = 'active';

-- 删除：只删除已离职且入职时间较早的员工
delete from employees
where status = 'inactive' and hire_date < '2020-01-01';

-- 删除全部数据，但保留表结构和自增属性
delete from employees_copy;
```

> ⚠️ 易错点：
> - `UPDATE`/`DELETE` 忘写 `WHERE` 会影响整张表，实际执行前应确认过滤条件；
> - `DELETE` 只删数据不删结构，`AUTO_INCREMENT` 不重置。

---

## 第 3 章 DQL 基础：WHERE / NULL / 排序 / 分页

### WHERE 与运算符

```sql
select * from employees where salary = 18000;
select * from employees where salary between 10000 and 20000; -- 闭区间
select * from employees where department_id in (2, 3, 4);
select * from employees where employee_name like '张%';       -- % 任意多个，_ 单个
select * from employees where employee_name like '%数据%';
select * from employees where email is null;                  -- 判断空必须用 IS NULL
```

运算符优先级：**括号 > 比较 > NOT > AND > OR**。

```sql
-- 下面的表达式等价于 department_id = 2
-- 或 salary > 20000 且 status = 'active'
where department_id = 2 or salary > 20000 and status = 'active'
-- 如果希望先完成 OR，再与 status 条件组合，必须加括号
where (department_id = 2 or salary > 20000) and status = 'active'
```

### NULL 三值逻辑

SQL 中 NULL 参与比较的结果不是 TRUE/FALSE，而是 **UNKNOWN**：

- `email = NULL` → 永远不是 TRUE（结果为 UNKNOWN）→ 查不出数据；
- `commission_rate + 1` 若 `commission_rate` 为 NULL，则结果为 NULL；
- 聚合函数**自动忽略 NULL**（`COUNT(*)` 除外，它数行数）；
- `IS NULL` / `IS NOT NULL` / `ISNULL()` 是唯一正确的判空方式。

```sql
-- 查找缺失邮箱
select * from employees where email is null;
-- 查找存在任一缺失值的员工
select *
from employees
where email is null
   or commission_rate is null
   or manager_id is null;
```

### DISTINCT 去重

```sql
select distinct department_id, status from employees;
-- 按整行去重
select distinct * from employees;
```

> ⚠️ `DISTINCT` 作用于后面**所有列的组合**，不是单独一列。

### ORDER BY 排序

```sql
select * from employees order by salary;                         -- 默认 ASC
select * from employees order by salary desc, hire_date asc;      -- 先薪资降序，再入职日期升序
select department_id, count(*) as employee_count
from employees
group by department_id
order by employee_count desc;                                     -- 可以用别名
```

- NULL 排序：MySQL 中 ASC → NULL 在最前，DESC → NULL 在最后（PostgreSQL 默认相反，可写 `NULLS LAST`）；
- `ORDER BY` 是执行顺序里倒数第二步，所以能用别名、能用窗口函数。

### LIMIT 分页

```sql
select * from employees limit 10;                 -- 前 10 条
select * from employees limit 10 offset 20;       -- 跳过 20 条取 10 条（第 21~30）
select * from employees limit 20, 10;             -- MySQL 旧写法：offset, count（等价上式）
```

> ⚠️ 深分页性能问题（`limit 100000, 10` 仍会扫描前 10 万行），第 13 章有优化。

---

## 第 4 章 聚合与分组

### 聚合函数与 NULL

```sql
count(*)   -- 数行数，包含 NULL 行
count(email)  -- 数 email 非 NULL 的行
count(distinct department_id)  -- 去重后计数
sum(salary) avg(salary) max(salary) min(salary)  -- 自动忽略 NULL
```

**COUNT 的常见陷阱：**

```sql
-- group by email 之后：
-- 若 email 非空：count(email) = count(*) = 该组行数
-- 若 email 为 NULL：count(email) = 0，count(*) = 组内行数
select email, count(email) as email_count, count(*) as row_count
from employees
group by email;
```

条件计数两种等价写法：

```sql
count(case when email is not null then 1 end)
-- 等价于
sum(case when email is not null then 1 else 0 end)
```

### GROUP BY 与 HAVING

```sql
-- 按一列或多列分组
select department_id, status, count(*) as employee_count
from employees
group by department_id, status;

-- HAVING 筛选分组（不是筛选行！）
select department_id, count(*) as employee_count
from employees
group by department_id
having count(*) > 5;

select department_id
from employees
group by department_id
having department_id > 1 and count(*) > 2;   -- 可混用列条件和聚合条件
```

**WHERE vs HAVING 一句话**：WHERE 先于分组过滤行，HAVING 后于分组过滤组；WHERE 不能放聚合函数，HAVING 可以。

**分组后 SELECT 的限制：**

> 标准 SQL 下，`SELECT` 中非聚合列必须出现在 `GROUP BY` 中。
> MySQL 默认开 `ONLY_FULL_GROUP_BY`（5.7+），否则报错；关掉后取到的非分组列是"碰运气"值。在需要兼容标准 SQL 的场景中，应显式遵守这一规则。

---

## 第 5 章 多表查询：JOIN 与集合运算

### 七种连接的韦恩图理解

| 连接 | 语义 | 返回 |
| --- | --- | --- |
| `INNER JOIN` | 两边都匹配 | 交集 |
| `LEFT JOIN` | 左边全部 + 右边能匹配的 | 左全集，右空则 NULL |
| `RIGHT JOIN` | 右边全部 + 左边能匹配的 | 右全集，左空则 NULL |
| `FULL OUTER JOIN` | 两边全部 | 并集，MySQL 不支持需模拟 |
| `CROSS JOIN` | 笛卡尔积 | a×b 行 |
| `LEFT ANTI JOIN` | 左边有、右边没有 | 左减右 |
| `SEMI JOIN` | 左边有且右边至少匹配，只返回左边 | 相当于 EXISTS |

```sql
select e.employee_id, e.employee_name, d.department_name
from employees e
inner join departments d on e.department_id = d.department_id;

select d.department_id, d.department_name, e.employee_name
from departments d
left join employees e on d.department_id = e.department_id;

select d.department_id, d.department_name, e.employee_name
from departments d
right join employees e on d.department_id = e.department_id;

-- FULL OUTER JOIN 模拟（MySQL 无原生支持）
select d.department_id, d.department_name, e.employee_id, e.employee_name
from departments d
left join employees e on d.department_id = e.department_id
union
select d.department_id, d.department_name, e.employee_id, e.employee_name
from departments d
right join employees e on d.department_id = e.department_id;
```

### ON 与 WHERE：LEFT JOIN 中的过滤位置

```sql
-- 情况 1：条件放 ON —— 保留所有部门，右侧只匹配在职员工
select d.department_name, e.employee_name, e.status
from departments d
left join employees e
  on d.department_id = e.department_id
 and e.status = 'active';

-- 情况 2：条件放 WHERE —— 等价于把 LEFT JOIN 变成 INNER JOIN
select d.department_name, e.employee_name, e.status
from departments d
left join employees e on d.department_id = e.department_id
where e.status = 'active';
-- 因为 e.status = 'active' 会把不匹配的 NULL 行过滤掉
```

> ⚠️ 常见问题：为什么在 `LEFT JOIN` 后通过 `WHERE` 过滤右表条件，结果行数会变少？原因是右表不匹配产生的 NULL 行也会被过滤。

### 自连接

```sql
-- 示例：员工与经理位于同一张表，用两个别名表示
select e.employee_name as employee_name,
       m.employee_name as manager_name
from employees e
left join employees m on e.manager_id = m.employee_id;
```

### 集合运算 UNION 家族

```sql
union        -- 合并 + 去重（按所有列）
union all    -- 合并不去重，更快
intersect    -- 交集（MySQL 8.0.31+；MariaDB 支持）
except       -- 差集（MySQL 8.0.31+；PG 叫 EXCEPT，MySQL 旧版用 NOT IN/EXISTS 模拟）
```

要求：两侧**列数相同、对应列类型兼容**；`UNION` 默认去重所以更慢，能确定无重复时用 `UNION ALL`。

---

## 第 6 章 子查询

### 子查询的四种形态

| 形态 | 返回 | 用法 |
| --- | --- | --- |
| 标量子查询 | 单行单列 | 当值用：`select employee_name, (select max(salary) from employees) from employees` |
| 列子查询 | 单列多行 | 配 `IN` `ANY` `ALL` |
| 行子查询 | 单行多列 | `(department_id, salary) = (select department_id, salary from employees where employee_id = 101)` |
| 表子查询 | 多行多列 | 放 `FROM` 当临时表（派生表），必须起别名 |

```sql
-- FROM 子查询：把子查询当临时表
select * from (
    select employee_id, employee_name, salary,
           row_number() over (order by salary desc) as salary_rank
    from employees
) t
where t.salary_rank = 2;
```

### IN / EXISTS / ANY / ALL

```sql
-- IN：值是否在集合内
select *
from employees
where department_id in (
    select department_id
    from departments
    where department_name in ('数据工程组', '数据分析组')
);

-- EXISTS：关心"是否存在"，通常配关联子查询
select d.*
from departments d
where exists (
    select 1
    from employees e
    where e.department_id = d.department_id
      and e.status = 'active'
);

-- ANY/ALL：与集合比较
select *
from employees
where salary > any (
    select salary from employees where department_id = 2
);  -- 大于任意一个 = 大于最小值

select *
from employees
where salary > all (
    select salary from employees where department_id = 2
);  -- 大于所有 = 大于最大值
```

**`ANY`/`ALL` 的等价关系：**

- `salary > ANY (子查询)` = `salary > MIN(...)`
- `salary < ANY (...)` = `salary < MAX(...)`
- `salary > ALL (...)` = `salary > MAX(...)`
- `salary < ALL (...)` = `salary < MIN(...)`
- `department_id = ANY (...)` = `department_id IN (...)`
- `department_id <> ALL (...)` = `department_id NOT IN (...)`

### 关联子查询

子查询引用外层表的列，逐行（或逐批）执行：

```sql
-- 找出比本部门平均工资高的员工
select *
from employees e
where salary > (
    select avg(salary)
    from employees
    where department_id = e.department_id   -- 关联条件
);
```

### NOT IN 的 NULL 陷阱

> 如果 `IN`/`NOT IN` 的子查询结果**包含 NULL**：
> - `department_id IN (2, NULL)`：只有 `department_id = 2` 的行匹配（与 NULL 的比较结果为 UNKNOWN）；
> - `department_id NOT IN (2, NULL)`：**结果为空集**！因为与 NULL 的不等比较结果为 UNKNOWN。

```sql
-- 错误示范：employees.manager_id 中包含 NULL，整条查询可能返回空
select *
from employees
where employee_id not in (select manager_id from employees);

-- 正确写法：用 NOT EXISTS
select e.*
from employees e
where not exists (
    select 1
    from employees subordinate
    where subordinate.manager_id = e.employee_id
);
```

**示例：统计购买过机械键盘和无线鼠标、但没有购买显示器的客户数量：**

```sql
-- 解法 1：IN + NOT IN（101=机械键盘，102=无线鼠标，103=显示器）
select count(distinct customer_id)
from orders o
join order_items oi on o.order_id = oi.order_id
where customer_id in (
    select o_a.customer_id
    from orders o_a
    join order_items oi_a on o_a.order_id = oi_a.order_id
    where oi_a.product_id = 101
)
  and customer_id in (
    select o_b.customer_id
    from orders o_b
    join order_items oi_b on o_b.order_id = oi_b.order_id
    where oi_b.product_id = 102
)
  and customer_id not in (
    select o_c.customer_id
    from orders o_c
    join order_items oi_c on o_c.order_id = oi_c.order_id
    where oi_c.product_id = 103
);

-- 解法 2：EXISTS / NOT EXISTS（NULL 安全，推荐）
select count(distinct c.customer_id)
from customers c
where exists (
    select 1
    from orders o_a
    join order_items oi_a on o_a.order_id = oi_a.order_id
    where o_a.customer_id = c.customer_id and oi_a.product_id = 101
)
  and exists (
    select 1
    from orders o_b
    join order_items oi_b on o_b.order_id = oi_b.order_id
    where o_b.customer_id = c.customer_id and oi_b.product_id = 102
)
  and not exists (
    select 1
    from orders o_c
    join order_items oi_c on o_c.order_id = oi_c.order_id
    where o_c.customer_id = c.customer_id and oi_c.product_id = 103
);

-- 解法 3：CTE + 集合语义，更易读
with
mechanical_keyboard_buyers as (
    select distinct o.customer_id
    from orders o
    join order_items oi on o.order_id = oi.order_id
    where oi.product_id = 101
),
wireless_mouse_buyers as (
    select distinct o.customer_id
    from orders o
    join order_items oi on o.order_id = oi.order_id
    where oi.product_id = 102
),
monitor_buyers as (
    select distinct o.customer_id
    from orders o
    join order_items oi on o.order_id = oi.order_id
    where oi.product_id = 103
)
select count(*)
from mechanical_keyboard_buyers keyboard_buyers
inner join wireless_mouse_buyers mouse_buyers
    on keyboard_buyers.customer_id = mouse_buyers.customer_id
left join monitor_buyers monitor_customers
    on keyboard_buyers.customer_id = monitor_customers.customer_id
where monitor_customers.customer_id is null;
```

### IN vs EXISTS 性能（一句话版）

- 子查询结果**小**、外层表**大**：`IN` 往往更好（先物化小结果）；
- 子查询**大**、外层**小**：`EXISTS` 更好（走外层的索引，逐行探测）；
- 现代优化器（MySQL 8.0 / PG）通常会自动改写两者，具体行为仍应通过执行计划验证。

---

## 第 7 章 函数库

### 字符串函数

| 函数 | 作用 | 注意 |
| --- | --- | --- |
| `concat(employee_name, email)` | 拼接 | 任一为 NULL 则结果为 NULL；`concat_ws('-', employee_name, email)` 忽略 NULL |
| `length(employee_name)` / `char_length(employee_name)` | 字节数 / 字符数 | 中文：length 是 3 倍字节（utf8mb4） |
| `substring(employee_name, 1, 2)` | 截取 | pos 从 1 开始，可为负数 |
| `left(employee_name, 2)` / `right(employee_name, 2)` | 取左/右侧字符 | |
| `upper(employee_name)` / `lower(employee_name)` | 大小写 | |
| `trim(employee_name)` / `ltrim` / `rtrim` | 去空格 | `trim(both 'x' from employee_name)` 去指定字符 |
| `replace(employee_name, ' ', '')` | 替换 | |
| `lpad(employee_id, 6, '0')` / `rpad(employee_id, 6, '0')` | 左/右填充 | 补 0、补前缀常用 |
| `locate('数据', employee_name)` | 子串位置 | 找不到返回 0 |
| `reverse(employee_name)` | 反转 | 回文判断常用 |

### 数值与日期函数

```sql
abs(-1) ceiling(1.2) floor(1.8) round(3.14159, 2) mod(7, 3) power(2, 10) rand()

-- 日期
now()                    -- 当前日期时间
curdate() / current_date -- 当前日期
year(order_date) month(order_date) day(order_date)
hour(order_date) minute(order_date) second(order_date)

datediff(order_date, '2026-07-01')    -- order_date - '2026-07-01' 的天数
timestampdiff(day, '2026-07-01', order_date) -- order_date - 起始日期（单位可换 month/hour）
date_add(order_date, interval 1 day)  -- 加，可写 month/year/hour/minute/second
date_sub(order_date, interval 1 day)  -- 减
date_format(order_date, '%Y-%m-%d')   -- 格式化
str_to_date('2026-07-31', '%Y-%m-%d') -- 字符串转日期
last_day(order_date)                  -- 当月最后一天
```

> ⚠️ 易错点：MySQL 使用 `DATEDIFF()`（无下划线），不是 `date_diff()`；
> `TIMESTAMPDIFF(unit, '2026-07-01', order_date)` 和 `DATEDIFF(order_date, '2026-07-01')` 的**相减方向相反**，写代码前先确认起止日期。

### 流程控制：CASE / IF / IFNULL / COALESCE

```sql
-- CASE 搜索式（区间判断）
case
    when score >= 90 then 'A'
    when score >= 80 then 'B'
    else 'C'
end

-- CASE 简单式（等值判断）
case subject
    when '语文' then 1
    when '数学' then 2
    else 0
end

if(score >= 60, 'pass', 'fail')     -- 简版二选一
ifnull(email, 'unknown@example.com') -- email 为 NULL 时给默认值
coalesce(email, employee_name, 'unknown') -- 返回第一个非 NULL
nullif(quantity, 0)                 -- 相等返回 NULL，不等返回 quantity
```

**CASE 三大用途**：多条件判断、按区间统计（配合 `sum(case when ...)`）、行列转换（第 14 章）。

---

## 第 8 章 窗口函数

### OVER 框架

窗口函数 = 普通函数 + `OVER (...)`。`OVER` 里三件套：

```sql
sum(salary) over (
    partition by department_id -- 1. 分区：按部门划分，不写 = 全表一个窗口
    order by salary            -- 2. 排序：影响排名、累计、默认帧
    rows between ... and ... -- 3. 帧（frame）：窗口内再限定行范围
)
```

**使用窗口函数时的三个规则：**

1. 窗口函数**只能出现在 SELECT 和 ORDER BY**，不能出现在 WHERE/HAVING（它在 HAVING 之后才计算）；
2. 要对窗口函数结果过滤 → 包一层子查询；
3. `PARTITION BY` 可以没有，但排序列数 `ROW_NUMBER`/`RANK`/`DENSE_RANK`/`LAG`/`LEAD` 必须配 `ORDER BY`。

### 帧（frame）边界

帧边界：

```sql
unbounded preceding   -- 分区起点
n preceding           -- 往前 n 行
current row           -- 当前行
n following           -- 往后 n 行
unbounded following   -- 分区终点
```

常用组合：

```sql
rows between unbounded preceding and current row   -- 从起点到当前行（累计）
rows between 1 preceding and current row            -- 前一行到当前行（移动平均）
rows between n preceding and n following            -- 前后各 n 行（滑动窗口）
rows between unbounded preceding and unbounded following  -- 整个分区
-- 简写：rows unbounded preceding 等价于第一种
```

**帧的默认规则：**

- 写了 `ORDER BY` → 默认帧是 `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`；
- 没写 `ORDER BY` → 帧是整个分区。

**ROWS vs RANGE vs GROUPS：**

- `ROWS`：按物理行数算（无脑数行）；
- `RANGE`：按 ORDER BY 的**值**算，排序值相同的行算同一帧（默认值范围，性能更重）；
- `GROUPS`：按"值相同的组"算，介于两者之间（MySQL 8.0+/PG 支持）。

### 四大类窗口函数

```sql
-- 1. 排序类
row_number() over (order by salary desc)   -- 1,2,3,4（并列也给不同号）
rank()       over (order by salary desc)   -- 1,1,3,4（并列同号，跳号）
dense_rank() over (order by salary desc)   -- 1,1,2,3（并列同号，不跳号）
ntile(4)     over (order by salary desc)   -- 平均分 4 桶，返回桶号 1~4
percent_rank() over (order by salary)      -- (rank-1)/(总行数-1)，0~1
cume_dist()  over (order by salary)        -- <= 当前值的行数占比，0~1（累计分布）

-- 2. 偏移类（前后行比较）
lag(salary, 1) over (order by hire_date)          -- 上一行的 salary，越界为 NULL
lag(salary, 1, 0) over (order by hire_date)       -- 越界给默认值 0
lead(salary, 1) over (order by hire_date)         -- 下一行的 salary

-- 3. 聚合类（组内聚合，区别于 GROUP BY 的"压缩行"）
sum(salary) over (partition by department_id order by hire_date) -- 组内累计
avg(salary) over (partition by department_id)                     -- 组内平均，每行都保留
max(salary) over (partition by department_id)
min(salary) over (partition by department_id)
count(*) over (partition by department_id)

-- 4. 取值类
first_value(salary) over (order by hire_date)     -- 窗口第一行的值
last_value(salary) over (order by hire_date)      -- 注意！受默认帧影响，要全分区需写帧
nth_value(salary, 2) over (order by hire_date)    -- 窗口第 2 行的值
```

> ⚠️ `LAST_VALUE` 的常见问题：默认帧到"当前行"为止，所以 `last_value` 不写帧时取的是当前行自己。
> 想取整个分区最后一行，必须显式写 `rows between unbounded preceding and unbounded following`。

### 窗口函数 vs GROUP BY 一句话

- `GROUP BY`：**压缩行数**，每组一行；
- 窗口函数：**不丢行**，每行保留，同时带上组内聚合结果。

### 典型应用骨架

```sql
-- 组内 TopN：按部门排名后在外层筛选
select * from (
    select employee_id, employee_name, department_id, salary,
           row_number() over (
               partition by department_id order by salary desc
           ) as salary_rank
    from employees
) t
where t.salary_rank <= 3;

-- 组内累计与占比（帕累托）
select category_name, sales_month, sales_amount,
       sum(sales_amount) over (
           partition by category_name order by sales_month
       ) as running_total,
       sum(sales_amount) over (
           partition by category_name order by sales_month
       ) / sum(sales_amount) over () as running_ratio
from monthly_sales;

-- 环比：与上一期比较
select category_name, sales_month, sales_amount,
       lag(sales_amount, 1) over (
           partition by category_name order by sales_month
       ) as previous_month_sales
from monthly_sales;

-- 去重取最新：row_number() = 1
select * from (
    select product_id, effective_at, unit_price,
           row_number() over (
               partition by product_id order by effective_at desc
           ) as price_rank
    from product_prices
) t
where t.price_rank = 1;
```

### 找第二大或第 N 大

```sql
-- 方法 1：标量子查询（只适合第二高薪资）
select max(salary)
from employees
where salary < (select max(salary) from employees);

-- 方法 2：distinct + 排序 + 分页（第 N 大通用，注意去重）
select distinct salary
from employees
where salary is not null
order by salary desc
limit 1 offset 1;            -- N=2 就是 offset 1；第 N 大写 offset N-1

-- 方法 3：窗口函数（最通用，能带出整行其他列）
select employee_id, employee_name, salary
from (
    select employee_id, employee_name, salary,
           dense_rank() over (order by salary desc) as salary_rank
    from employees
) t
where t.salary_rank = 2;
```

> 按需选函数：并列也要占位 → `rank`；并列不占位 → `dense_rank`；只要不重复 → `row_number`。

---

## 第 9 章 CTE：WITH ... AS

### 基本用法与作用域

```sql
with
engineering_employees as (
    select employee_id, employee_name, salary
    from employees
    where department_id = 2
),
high_salary_engineers as (
    select employee_id, employee_name, salary
    from engineering_employees
    where salary >= 20000
)
select *
from high_salary_engineers;
```

> ⚠️ **作用域：** CTE 只对**紧随其后的那一条语句**生效，
> 后面再写别的 SELECT 就用不到了。所以"定义 → 别的语句 → 再用"是错的。

### 递归 CTE（MySQL 8.0+ / PG 都支持）

结构 = 锚点（初始行）`UNION ALL` 递归部分（引用自己 + 终止条件）：

```sql
-- 生成 1~10 数字序列（斐波那契、日期序列同理）
with recursive seq (n) as (
    select 1                     -- 锚点
    union all
    select n + 1 from seq where n < 10   -- 递归 + 终止条件
)
select * from seq;

-- 部门树：从数据工程组向上找所有上级
with recursive department_tree as (
    select department_id, department_name, parent_department_id, 1 as level
    from departments
    where department_id = 2
    union all
    select d.department_id, d.department_name, d.parent_department_id, t.level + 1
    from departments d
    inner join department_tree t
        on d.department_id = t.parent_department_id
)
select * from department_tree;
```

> 递归 CTE 包含三个部分：锚点查询、递归查询（引用自身）和终止条件（通过 `WHERE` 限制递归深度，防止死循环）。

---

## 第 10 章 视图、临时表与派生表

### 视图

```sql
create view active_employees as
select employee_id, employee_name, department_id, salary
from employees
where status = 'active';

drop view active_employees;
```

- 本质：**保存的查询**，不是数据副本（非物化视图）——每次使用都重新执行；
- 用途：隐藏敏感列、统一复杂查询、逻辑隔离；
- 可更新视图的条件：单表、不含 `DISTINCT/GROUP BY/聚合/UNION`；
- MySQL 无原生物化视图（PG 有 `MATERIALIZED VIEW`）。

### 临时表、派生表与 CTE

| 类型 | 位置 | 生命周期 | 特点 |
| --- | --- | --- | --- |
| 派生表（FROM 子查询） | 语句内 | 语句结束即销毁 | 必须起别名，不能复用 |
| CTE | 语句内 | 紧随其后的语句 | 可多次引用，可递归 |
| `CREATE TEMPORARY TABLE` | 会话内 | 会话结束或 DROP | 显式建表，可加索引 |

```sql
create temporary table high_salary_employees_tmp as
select employee_id, employee_name, department_id, salary
from employees
where salary >= 20000;
```

---

## 第 11 章 事务与隔离级别

### ACID

| 特性 | 含义 | 破坏它的问题 |
| --- | --- | --- |
| Atomicity 原子性 | 全做或全不做，靠 undo log 回滚 | 中途失败 |
| Consistency 一致性 | 事务前后数据满足约束 | 约束破坏 |
| Isolation 隔离性 | 事务互不干扰，靠锁 + MVCC | 并发问题 |
| Durability 持久性 | 提交后不丢，靠 redo log 落盘 | 宕机 |

```sql
start transaction;
update accounts
set balance = balance - 100
where account_id = 1001 and balance >= 100;
update accounts
set balance = balance + 100
where account_id = 1002;
commit;        -- 提交
-- 或 rollback; -- 回滚
-- 进阶：savepoint before_transfer; ... rollback to before_transfer; 部分回滚
```

### 三个并发问题

| 问题 | 定义 | 直观例子 |
| --- | --- | --- |
| 脏读 | 读到**未提交**的数据 | A 改未提交，B 读到，A 回滚 → B 读到假数据 |
| 不可重复读 | 同一行两次读**值不同** | B 读 account_id=1001 的余额为 1000，A 改成 1200 并提交，B 再读变为 1200 |
| 幻读 | 两次读**行数不同**（出现新行） | B 查 5 行，A 插入 1 行提交，B 再查 6 行 |

### 四个隔离级别及其解决的问题

| 隔离级别 | 脏读 | 不可重复读 | 幻读 |
| --- | --- | --- | --- |
| READ UNCOMMITTED | 可能 | 可能 | 可能 |
| READ COMMITTED | 解决 | 可能 | 可能 |
| REPEATABLE READ | 解决 | 解决 | 可能（InnoDB 下基本避免） |
| SERIALIZABLE | 解决 | 解决 | 解决 |

- **MySQL 默认 REPEATABLE READ**，PostgreSQL 默认 READ COMMITTED；
- MySQL 的 RR 靠 MVCC（快照读）+ next-key lock（当前读）在**大多数场景**下避免了幻读；
- 快照读 vs 当前读：普通 `SELECT` 是快照读（读版本链）；`SELECT ... FOR UPDATE` / `FOR SHARE` / `UPDATE` / `DELETE` 是当前读（读最新 + 加锁）。

### 锁与乐观/悲观

- 悲观锁：`select ... for update`（行锁，配合事务）；`for share` 是共享锁；
- 乐观锁：`accounts` 表上加 `version` 字段，`update accounts set version = version + 1 where account_id = 1001 and version = 0`，影响行数为 0 则重试；
- 行锁、间隙锁（gap lock）、next-key lock（行锁 + 间隙锁）：间隙锁/临键锁是 InnoDB 防幻读的当前读手段。

---

## 第 12 章 索引

### 为什么是 B+ 树

- 矮胖、层数少（3 层能存千万级），磁盘 I/O 次数少；
- 非叶子节点只存索引键 → 扇出大；
- 叶子节点有序 + 链表 → 范围查询高效（`> < between`）。

### 聚簇索引 vs 二级索引（InnoDB）

| | 聚簇索引 | 二级索引 |
| --- | --- | --- |
| 默认 | 主键（无主键则隐藏 rowid） | 普通索引/联合索引 |
| 叶子存什么 | 整行数据 | 索引键 + 主键值 |
| 查询 | 一次定位到行 | 找到主键 → **回表**再查一次 |

```sql
-- 回表例子：idx_employees_department_salary 是二级索引，查询还需要 employee_name
-- 先查索引拿 employee_id，再回聚簇树取 employee_name
select employee_name
from employees
where department_id = 2 and salary = 18000;

-- 覆盖索引：查询只需要索引中的 department_id 和 salary，不用回表
select department_id, salary
from employees
where department_id = 2 and salary = 18000;   -- Extra 显示 Using index
```

### 联合索引与最左前缀

索引 `(department_id, salary, hire_date)` 能匹配的查询：

```sql
where department_id = 2                                      -- ✅ 用
where department_id = 2 and salary = 18000                   -- ✅ 用
where department_id = 2 and salary = 18000
  and hire_date >= '2024-01-01'                              -- ✅ 全用
where salary = 18000 and hire_date >= '2024-01-01'             -- ❌ 跳过 department_id
where department_id = 2 and hire_date >= '2024-01-01'          -- ⚠️ 只用 department_id，hire_date 用不上
```

> 口诀：**带头大哥不能死，中间兄弟不能断**。

### 索引失效的六大场景

```sql
-- 1. 对索引列做函数/运算
where date(order_date) = '2026-07-31'    -- ❌ 应改范围：order_date >= '2026-07-31' and order_date < '2026-08-01'
where salary + 1 = 50001                -- ❌ 应写 salary = 50000

-- 2. 隐式类型转换（字符串列 vs 数字）
where email = 123                          -- ❌ email 是字符串列，却与数字比较

-- 3. LIKE 前导通配符
where employee_name like '%数据'          -- ❌ 无法定位起点
where employee_name like '数据%'          -- ✅ 前缀匹配能走索引

-- 4. OR 连接非索引条件
where department_id = 2 or email = 'a@example.com' -- ❌ email 无索引时整体可能退化

-- 5. NOT IN / NOT EXISTS / <>/!=（引擎可能优化成 range）
where department_id not in (2, 3, 4)      -- ⚠️ 一般不如等值/范围条件稳定

-- 6. 联合索引不满足最左前缀
where salary = 18000                       -- ❌ 见上节
```

> 补充：`IS NULL`/`IS NOT NULL` 在 MySQL 中**可以**走索引（5.7+ 正常优化），因此"IS NULL 一定导致索引失效"的说法并不准确。

### EXPLAIN 看执行计划

```sql
explain
select employee_id, employee_name
from employees
where department_id = 2 and salary >= 18000;
```

关键列：`type`（访问类型）、`key`（实际用的索引）、`rows`（预估行数）、`Extra`。

`type` 从好到坏：`const` > `eq_ref` > `ref` > `range` > `index` > `ALL`

- `const`：主键/唯一键等值，最多一行；
- `eq_ref`：JOIN 用主键/唯一键关联，每行只匹配一行；
- `ref`：普通索引等值；
- `range`：索引范围扫描（`> < between like 'ab%'`）；
- `index`：扫整个索引树（比 ALL 快但仍全量）；
- `ALL`：全表扫描，要尽量避免。

`Extra` 常见红绿灯：

- `Using index`：覆盖索引 ✅；
- `Using filesort`：文件排序（ORDER BY 没走索引）⚠️；
- `Using temporary`：用临时表（常见于 GROUP BY/去重）⚠️；
- `Using where`：Server 层过滤，本身正常，配合 ALL 才危险。

---

## 第 13 章 优化：从执行计划到验证

常用优化流程：**先 EXPLAIN → 看 type/rows/Extra → 对症下药 → 验证**。

### 常见优化手段

```sql
-- 1. 避免 select *：按需取列，配合覆盖索引减少回表
-- 2. 索引失效场景逐个排查（第 12 章六大场景）
-- 3. 深分页优化：延迟关联
--    慢：select * from employees order by employee_id limit 100000, 10;
--    快：先在小结果上取 employee_id，再 join 回全表
select e.*
from employees e
inner join (
    select employee_id
    from employees
    order by employee_id
    limit 100000, 10
) page on e.employee_id = page.employee_id
order by e.employee_id;

-- 4. 大事务拆小、分批删除（每次 limit 1000，循环）
-- 5. 避免在 WHERE 里对列做隐式转换/函数（第 12 章）
-- 6. 合理冗余：高频统计字段落表，减少 join 和聚合
-- 7. 慢查询定位：开启慢查询日志，抓执行时间长的 SQL
```

> 实践原则：任何优化都要通过 `EXPLAIN` 验证，不应只凭感觉判断。

---

## 第 14 章 题型方法论：十大题型

### 题型 1：第 N 大 / TopN

- 全局 TopN：`order by salary desc limit 3` 或 `dense_rank() over (order by salary desc)` + 外层筛选；
- **组内** TopN（每部门工资前三）：`row_number() over (partition by department_id order by salary desc)` 后取 `salary_rank <= 3`；
- 并列处理：要并列用 `rank`/`dense_rank`。

### 题型 2：连续问题（连续登录 N 天）

核心思想：**日期减去行号，连续的天数差值相同**。

```sql
-- 每个客户的最长连续登录天数
select customer_id, count(*) as continuous_days
from (
    select customer_id, login_date,
           date_sub(login_date, interval row_number() over (
               partition by customer_id order by login_date
           ) day) as grp
    from customer_logins
) t
group by customer_id, grp;
-- 再套一层 max(continuous_days) 即最长连续
```

### 题型 3：留存率

```sql
-- 次日留存率：首日登录客户的次日回访比例
select first_login.first_day,
       count(distinct next_login.customer_id)
           / count(distinct first_login.customer_id) as next_day_retention
from (
    select customer_id, min(login_date) as first_day
    from customer_logins
    group by customer_id
) first_login
left join customer_logins next_login
       on first_login.customer_id = next_login.customer_id
      and datediff(next_login.login_date, first_login.first_day) = 1
group by first_login.first_day;
```

### 题型 4：累计 / 移动计算 / 占比

```sql
-- 累计求和：sum over + 帧
select category_name, sales_month, sales_amount,
       sum(sales_amount) over (
           partition by category_name order by sales_month
       ) as cumulative_sales
from monthly_sales;

-- 移动平均（近 3 个月）
select category_name, sales_month, sales_amount,
       avg(sales_amount) over (
           partition by category_name
           order by sales_month rows between 2 preceding and current row
       ) as moving_average_3m
from monthly_sales;

-- 各品类占比
select category_name, sales_amount,
       sales_amount / sum(sales_amount) over () as sales_ratio
from monthly_sales;
```

### 题型 5：环比 / 同比

```sql
select category_name, sales_month, sales_amount,
       lag(sales_amount, 1) over (
           partition by category_name order by sales_month
       ) as previous_month_sales,
       round((sales_amount - lag(sales_amount, 1) over (
                   partition by category_name order by sales_month
              )) / lag(sales_amount, 1) over (
                   partition by category_name order by sales_month
              ), 4) as mom_ratio  -- 环比
from monthly_sales;
-- 同比：lag(sales_amount, 12) over (partition by category_name order by sales_month)，月度数据就是和去年同月比
```

### 题型 6：去重取最新（每种商品的最新价格）

```sql
select * from (
    select product_id, effective_at, unit_price,
           row_number() over (
               partition by product_id order by effective_at desc
           ) as price_rank
    from product_prices
) t
where t.price_rank = 1;
```

### 题型 7：行列转换

```sql
-- 行转列：case when + 聚合
select student_id,
       max(case when subject = '语文' then score end) as chinese_score,
       max(case when subject = '数学' then score end) as math_score,
       max(case when subject = '英语' then score end) as english_score
from student_scores
group by student_id;

-- 列转行：union all
select student_id, '语文' as subject, chinese_score as score
from student_score_summary
union all
select student_id, '数学', math_score
from student_score_summary
union all
select student_id, '英语', english_score
from student_score_summary;
```

> 注意行转列时用 `max(...)`（或 `sum`）包住 CASE，因为 GROUP BY 后每组多行，聚合取非 NULL 值。

### 题型 8：中位数

```sql
select avg(salary) as median_salary
from (
    select salary,
           row_number() over (order by salary) as rn,
           count(*) over () as cnt
    from employees
) t
where rn in (floor((cnt + 1) / 2), ceil((cnt + 1) / 2));
```

### 题型 9：空值 / 缺失处理

```sql
-- 查空值：is null；填默认：ifnull / coalesce
select employee_name, coalesce(email, 'unknown@example.com') as email
from employees;

-- 分组统计空值率
select sum(case when email is null then 1 else 0 end) / count(*) as email_null_rate
from employees;
```

### 题型 10：集合语义题（"都/至少/恰好"型）

- "同时满足 A 和 B" → `inner join` 或双 `in`/双 `exists`；
- "满足 A 不满足 B" → 优先使用 `not exists`（`not in` 的 NULL 陷阱见第 6 章）；
- "至少出现 2 次" → `group by ... having count(*) >= 2`。

```sql
-- 示例：筛选在订单明细中出现过至少 2 次的商品
select product_id
from order_items
group by product_id
having count(*) >= 2;
```

---

## 结尾自测清单

- [ ] 能默写子句执行顺序并解释为什么 WHERE 不能用别名/聚合
- [ ] 能讲清 NULL 三值逻辑、`NOT IN` 空集陷阱、`COUNT(email)` vs `COUNT(*)`
- [ ] 能画出七种 JOIN，讲清 LEFT JOIN 的 ON vs WHERE
- [ ] 能用三种方法统计购买过机械键盘但没有购买显示器的客户
- [ ] 能默写 OVER 三件套、默认帧规则、`LAST_VALUE` 的坑
- [ ] 能区分 `rank/dense_rank/row_number` 并各举一题
- [ ] 能写出递归 CTE 结构（锚点 + 递归 + 终止）
- [ ] 能说明四个隔离级别各自解决什么问题，以及 MySQL/PG 的默认级别
- [ ] 能讲清 B+ 树、聚簇/二级索引、回表、覆盖索引、最左前缀
- [ ] 能说明六大索引失效场景，并各配一个反例 SQL
- [ ] 能独立写出：连续登录、留存率、环比、TopN、行列转换、中位数

---

## 附录：示例表结构与样例数据

本文中的 SQL 示例都基于下面这套教学数据模型。表结构保持足够小，重点是让字段名能够直接表达业务含义，并支持前文的 JOIN、聚合、窗口函数、事务和索引示例。

| 表 | 用途 | 关键关系 |
| --- | --- | --- |
| `departments` | 部门层级 | `parent_department_id` 自关联 |
| `employees` | 员工与薪资 | 关联部门，并通过 `manager_id` 自关联 |
| `customers` | 客户主数据 | 关联订单、登录记录和账户 |
| `products` | 商品主数据 | 关联订单明细和价格历史 |
| `orders` | 订单主表 | 关联客户 |
| `order_items` | 订单明细 | 关联订单和商品 |
| `customer_logins` | 客户登录事件 | 支持连续登录与留存分析 |
| `accounts` | 账户余额 | 支持事务与乐观锁示例 |
| `monthly_sales` | 月度品类销售额 | 支持累计、移动平均和环比 |
| `product_prices` | 商品价格历史 | 支持去重取最新 |
| `student_scores` | 学科成绩明细 | 支持行转列 |
| `student_score_summary` | 学科成绩宽表 | 支持列转行 |

### 建表脚本

```sql
create table departments (
    department_id int primary key,
    department_name varchar(100) not null,
    parent_department_id int null,
    constraint uk_departments_name unique (department_name),
    constraint fk_departments_parent
        foreign key (parent_department_id)
        references departments(department_id)
);

create table employees (
    employee_id int primary key,
    employee_name varchar(100) not null,
    department_id int not null,
    manager_id int null,
    salary decimal(10,2) not null,
    commission_rate decimal(5,2) null,
    email varchar(150) null,
    hire_date date not null,
    status varchar(20) not null default 'active',
    constraint fk_employees_department
        foreign key (department_id)
        references departments(department_id),
    constraint fk_employees_manager
        foreign key (manager_id)
        references employees(employee_id)
);

create table customers (
    customer_id int primary key,
    customer_name varchar(100) not null,
    signup_date date not null
);

create table products (
    product_id int primary key,
    product_name varchar(100) not null,
    category_name varchar(50) not null,
    unit_price decimal(10,2) not null
);

create table orders (
    order_id int primary key,
    customer_id int not null,
    order_date date not null,
    order_status varchar(20) not null,
    constraint fk_orders_customer
        foreign key (customer_id)
        references customers(customer_id)
);

create table order_items (
    order_id int not null,
    product_id int not null,
    quantity int not null,
    unit_price decimal(10,2) not null,
    primary key (order_id, product_id),
    constraint fk_order_items_order
        foreign key (order_id)
        references orders(order_id),
    constraint fk_order_items_product
        foreign key (product_id)
        references products(product_id)
);

create table customer_logins (
    customer_id int not null,
    login_date date not null,
    primary key (customer_id, login_date),
    constraint fk_customer_logins_customer
        foreign key (customer_id)
        references customers(customer_id)
);

create table accounts (
    account_id int primary key,
    customer_id int not null,
    balance decimal(12,2) not null default 0.00,
    version int not null default 0,
    constraint fk_accounts_customer
        foreign key (customer_id)
        references customers(customer_id)
);

create table monthly_sales (
    sales_month date not null,
    category_name varchar(50) not null,
    sales_amount decimal(14,2) not null,
    primary key (sales_month, category_name)
);

create table product_prices (
    price_id int primary key,
    product_id int not null,
    effective_at datetime not null,
    unit_price decimal(10,2) not null,
    unique (product_id, effective_at),
    constraint fk_product_prices_product
        foreign key (product_id)
        references products(product_id)
);

create table student_scores (
    student_id int not null,
    student_name varchar(100) not null,
    subject varchar(20) not null,
    score decimal(5,2) not null,
    primary key (student_id, subject)
);

create table student_score_summary (
    student_id int primary key,
    chinese_score decimal(5,2) not null,
    math_score decimal(5,2) not null,
    english_score decimal(5,2) not null
);
```

### 样例数据

```sql
insert into departments
    (department_id, department_name, parent_department_id)
values
    (1, '数据平台部', null),
    (2, '数据工程组', 1),
    (3, '数据分析组', 1),
    (4, '财务部', null);

insert into employees
    (employee_id, employee_name, department_id, manager_id,
     salary, commission_rate, email, hire_date, status)
values
    (101, '张晨', 2, null, 24000.00, 0.10, 'zhang.chen@example.com', '2022-03-15', 'active'),
    (105, '陈雪', 4, null, 16000.00, null, 'chen.xue@example.com', '2021-07-01', 'active');

insert into employees
    (employee_id, employee_name, department_id, manager_id,
     salary, commission_rate, email, hire_date, status)
values
    (102, '李宁', 2, 101, 20000.00, null, 'li.ning@example.com', '2023-01-10', 'active'),
    (103, '王芳', 3, 101, 18000.00, 0.05, 'wang.fang@example.com', '2023-05-20', 'active'),
    (104, '赵磊', 3, 101, 18000.00, null, null, '2024-02-01', 'active'),
    (106, '周浩', 2, 101, 12000.00, null, 'zhou.hao@example.com', '2019-08-12', 'inactive');

insert into customers (customer_id, customer_name, signup_date)
values
    (1, '林晓', '2026-01-03'),
    (2, '陈宇', '2026-01-05'),
    (3, '周宁', '2026-01-08'),
    (4, '许安', '2026-01-12');

insert into products (product_id, product_name, category_name, unit_price)
values
    (101, '机械键盘', '外设', 299.00),
    (102, '无线鼠标', '外设', 149.00),
    (103, '显示器', '显示设备', 1299.00);

insert into orders (order_id, customer_id, order_date, order_status)
values
    (10001, 1, '2026-02-01', 'completed'),
    (10002, 1, '2026-02-15', 'completed'),
    (10003, 2, '2026-02-03', 'completed'),
    (10004, 3, '2026-02-06', 'completed'),
    (10005, 4, '2026-02-09', 'completed');

insert into order_items (order_id, product_id, quantity, unit_price)
values
    (10001, 101, 1, 299.00),
    (10001, 102, 1, 149.00),
    (10002, 102, 2, 149.00),
    (10003, 101, 1, 299.00),
    (10003, 103, 1, 1299.00),
    (10004, 101, 1, 299.00),
    (10004, 102, 1, 149.00),
    (10004, 103, 1, 1299.00),
    (10005, 102, 1, 149.00);

insert into customer_logins (customer_id, login_date)
values
    (1, '2026-07-01'), (1, '2026-07-02'), (1, '2026-07-03'),
    (2, '2026-07-01'), (2, '2026-07-03'),
    (3, '2026-07-02'), (3, '2026-07-03'),
    (4, '2026-07-04');

insert into accounts (account_id, customer_id, balance, version)
values
    (1001, 1, 1000.00, 0),
    (1002, 2, 500.00, 0);

insert into monthly_sales (sales_month, category_name, sales_amount)
values
    ('2026-01-01', '外设', 12000.00),
    ('2026-02-01', '外设', 14500.00),
    ('2026-03-01', '外设', 16800.00),
    ('2026-01-01', '显示设备', 21000.00),
    ('2026-02-01', '显示设备', 19800.00),
    ('2026-03-01', '显示设备', 23600.00);

insert into product_prices (price_id, product_id, effective_at, unit_price)
values
    (1, 101, '2026-01-01 00:00:00', 299.00),
    (2, 101, '2026-03-01 00:00:00', 279.00),
    (3, 102, '2026-01-01 00:00:00', 149.00),
    (4, 102, '2026-03-01 00:00:00', 129.00),
    (5, 103, '2026-01-01 00:00:00', 1299.00);

insert into student_scores (student_id, student_name, subject, score)
values
    (1, '林一', '语文', 88.00),
    (1, '林一', '数学', 92.00),
    (1, '林一', '英语', 85.00),
    (2, '周二', '语文', 91.00),
    (2, '周二', '数学', 86.00),
    (2, '周二', '英语', 90.00);

insert into student_score_summary
    (student_id, chinese_score, math_score, english_score)
values
    (1, 88.00, 92.00, 85.00),
    (2, 91.00, 86.00, 90.00);
```
