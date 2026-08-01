首先是ddl，data define language,
包括关键字 create,alter,drop.

create database if not exist xxx;

create table xxx (

字段， 类型， 约束。

);

insert into xxx(c1,c2,c3) values (v1,v2,v3);

create table xxx_copy like xxx;

create tabele xxx as select ccc from yyy where zzz; ( CREATE TABLE ... AS SELECT ...) 


alter 表名 具体操作;
包括 add column, modify column, drop column, rename column.
add constraint, drop constraint.
add index. add index xx (c1,c2); drop index xx;
add constraint fk_xxx_yyy foreign key (c1,c2) references yyy(c1,c2);
drop primary key; drop foreign key fk_xxx_yyy;
alter table xxx rename to yyy;
rename table xxx to yyy; 

alter table xxx add column c4 int;
alter table xxx add column c4 varchar(100) after c3;
alter table xxx add colum c4 int first;

alter table xxx modify column c4 varchar(200) not null;
alter table xxx rename column c4 to c5;
alter table xxx change column c5 c6 int; (old version mysql, 应该重写字段类型)

alter table xxx drop column c6; 

alter table xxx add constraint fk unique (c1);

alter table xxx add index idx_c1 (c1);
alter table xxx add index idx-c1-c2 (c1,c2);

alter table xxx add constraint fk_xxx_yyy foreign key(c1,c2) references yyy(c1,c2);

alter table xxx drop index idx_c1;
alter table xxx drop primary key;
alter table xxx drop foreign key fk_xxx_yyy;

alter table xxx rename to yyy;
rename table xxx to yyy;

drop table xxx;
drop table if exists xxx;

drop database xxx;
drop view xxx;

truncate table xxx;
delete from xxx;


---


create table xxc like xxx; 会继承源表的所有约束，索引，触发器，事件。
create table xxc as select * from xxx; 不会继承源表的所有约束，索引，触发器，事件。

---

基础查询
select, distinct, where, order by, limit, 

多表查询
join, left join, right join, inner join, outer join, cross join, union

聚合查询
grou by, having, 聚合函数

子查询
标量子查询, in, exists, 关联子查询

条件与函数
case when, if, ifnull, coalesce, 字符串函数、日期函数、空值处理

窗口函数
row_number, rank, dense_rank, percent_rank, cume_dist, ntile, lead, lag, first_value, last_value, nth_value.
排名、累计、前后行比较、组内topN

高级查询
cte, 递归cte, 集合运算。

---
count() sum() avg() max() min()

concat() length() substring() upper() lower() trim()

year() month() day() hour() minute() second()
date() date_diff() date_add() date_sub()

case when, if(), ifnull(), coalesce()

row_number() rank() dense_rank() 
sum() over()
avg() over()
lag() lead()

---

insert into xxx(c1,c2,c3) values (v1,v2,v3);
insert into xxx(c1,c2,c3) values
(v11,v21,v31),
(v12,v22,v32),
(v13,v23,v33);

insert into xxx(c1,c2,c3) select c1,c2,c3 from yyy where zzz;

update xxx
set c1=v1, c2=v2, c3=v3
where zzz;

update xxx
set c1=c1+1, c2=c2+1, c3=c3+1
where zzz;

delete from xxx
where zzz;

delete from xxx;

---
start transaction 

update xxx set c1=c1+1 where c1=1;
update xxx set c1=c1+1 where c1=2;

commit;

rollback;

---

## 基础查询

查找缺失值。 
select * from xxx where c1 is null;
select * from xxx where c1 is not null;

查找存在缺失值的列
select * 
from xxx
where
c1 is null
or c2 is null
or c3 is null
or ...;

去掉重复数据（不修改表）
select distinct c1,c2,c3 from xxx;
select distinct * from xxx;

汇总函数：
count sum avg max min.

count(c1).
count(*).
count(distinct c1).
count(case when c1 is not null then 1 end) / sum(case when c1 is not null then 1 else 0 end)

group by c1
having count(c1) > 100; // when c1 is not null, count(c1) = count(*). (after group by c1)
// if c1 is null, count(c1) = 0. count(*) = number of rows. (after group by c1)

分组汇总。
'having' is used to filter groups. not row of records.

group by c1,c2,c3
having c1 > 100 and c2 > 100 and c3 > 100;

group by c1,c2,c3
having count(), sum(), max(), min() xxx. 

to be cautious:
when 'group by' is used, only the columns in groupby and 聚合function can be used in select.

---
## 复杂查询

子查询。
'from 子查询'
select * from xxx where c1 in (select c1 from yyy where zzz);
'select' in 'from'.

you can regard child query as a temporary table.(in the memory)

找出第二大的值
select max(c1) from xxx where c1 < (select max(c1) from xxx);
select distinct c1 from xxx where c1 is not null order by c1 desc limit 1 offset 1;
select c1 from (
    select c1, row_number() over(order by c1 desc) as rn
    from xxx
    where c2 = yyy
) t
where t.rn = 2;

第N大：
推荐窗口函数,
根据需求选择 rank(), dense_rank(), row_number(), 然后根据需求选择 top N 的数据。


select 
    c1
from (
    select
        c1,
        dense_rank() over(order by c1 desc)
    from xxx
    where ...
) t
where t.rn = N;

查找第N大的所有c2：

select 
    c1,
    c2
from (
    select 
        c1,
        c2,
        dense_rank() over(order by c1 desc) as rn
    from xxx
    where ...
) t
where t.rn = N;

'in 子查询'
经常用在where子句中，表示“在/不在某个范围中“的数据。

比如，查找买过A买过B但没买过C的顾客数量。（在范围A，范围B但不在范围C）

select count(distinct id)
from xxx
where
id in (select distinct id from xxx where product = 'A')
and id in (select distinct id from xxx where product = 'B')
and id not in (select distinct id from xxx where product = 'C)

'all/any'
all: 所有满足条件的值都满足条件，则返回true。
any: 只要有一个满足条件的值满足条件，则返回true。

\>all/any, <all/any, =all/any, <>all/any

select price from xxx where price > all (select price from yyy where zzz);
select price from xxx where price > any (select price from yyy where zzz);

临时表
with ... as;

with 
a as (select distinct id from xxx where c1 = 'A'),
b as (select distinct id from xxx where c1 = 'B'),
c as (select distince id from xxx where c1 = 'C')
select count(distinct id)
from xxx
where
id in (select id from a)
and id in (select id from b)
and id not in (select id from c);

to be cautious: 用with ... as 定义的临时表，后面必须直接跟该临时表的SQL语句，否则临时表失效。
right:
with c as
(select * from xxx where c1 = 'C')
select * from yyy where c1 in (select * from c);

wrong:
with c as
(select * from xxx where c1 = 'C')
select * from b;

select * from yyy where c1 in (select * from c);

视图。
“虚拟表”，每次使用重新计算。为了数据安全等。

case。

case 
when a then b
when c then d
when e then f
else g
end.

用于
多条件判断，
按区间统计，
行列互换等问题。

---
## 多表查询
left join, right join, inner join, full join.

韦恩图来理解的话。
Inner Join
= 两边匹配的记录组合

Left Join
= 左边全部 + 能匹配的右边数据

Right Join
= 右边全部 + 能匹配的左边数据

Full Outer Join
= 左边全部 + 右边全部

Left Anti Join
= 左边有、右边没有

Right Anti Join
= 右边有、左边没有

Semi Join
= 左边有，并且右边至少存在匹配，但只返回左边

---
## 窗口函数

row_number()
rank()
dense_rank()

'in over'
OVER ( ... )
partition by
order by
rows between unbounded preceding and current row
rows between 1 preceding and current row
rows between x preceding and y following // x could be 1..N and 'unbounded', y 
‘’‘
UNBOUNDED PRECEDING
N PRECEDING
CURRENT ROW
N FOLLOWING
UNBOUNDED FOLLOWING
’‘’

'percent'
ntile(N) over (...) // make groups of N rows, and return the group number.
percent_rank() over (...) 
cume_dist() over (...)

'lead/lag'
lag(c1, 1) over (...) 
lead(c1, 1) over (...)
// lag(c1, 1) over (...) 表示取当前行前1行的c1值。
// 处理
相邻时间差
连续登录
状态变化
判断断点
环比、同比等问题。

date - lag(date, 1) over (...) as diff // time diff

'normal function'
sum() over(...)
avg() over(...)
max() over(...)
min() over(...)
count() over(...)

first_value() over(...)
last_value() over(...)
nth_value() over(...)

按题型：
1.排名类
row_number(), rank(), dense_rank()

2.组内topN
排名后筛选 rn = N

3.累计与移动计算
sum/avg + 窗口范围

4.前后行比较
lag/lead

5.连续问题
lag 或 日期减row_number

6.去重取最新
row_number=1

7.百分位与分层
ntile(N) over (...)
percent_rank() over (...)
cume_dist() over (...)

8.组内占比与比较
聚合函数 over(...)
value - avg(value) over(...)
value - max(value) over(...)
value / sum(value) over(...)


