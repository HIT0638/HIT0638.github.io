# 词法分析软件Flex使用(更新中)

# Before the article
References:
- [Lexical Analysis With Flex, for Flex 2.6.2](https://westes.github.io/flex/manual/index.html#SEC_Contents)

# Introduction
flex is a tool for **generating scanners**. A scanner is a program which **recognizes lexical patterns in text**.   
The flex program reads the given input files, or its standard input if no file names are given, for a description of a scanner to generate.   
The description is in the form of pairs of regular expressions and C code, called rules. flex generates as output a C source file, `lex.yy.c` by default, which defines a routine `yylex()`. This file can be compiled and linked with the flex runtime library to produce an executable. When the executable is run, it analyzes its input for occurrences of the regular expressions. Whenever it finds one, it executes the corresponding C code.

# Download & Install
In Ubuntu, use the command below to download and install _the Flex and Bison.
> sudo apt-get install flex bison

After that, you can test whether it was successful or not by running the following commands:
> flex --version

> bison --version

We can write a example to test:
```
// example t.l
%{
int chars = 0;
int words = 0;
int lines = 0;
%}
%%
[a-zA-Z]*    { words++; chars += strlen(yytext); }
\n           { lines++; }
.            { chars++; }
%%

void main(int argc, char** argv)
{
    yylex();
    printf("%8d%8d%8d\n", lines, words, chars);
}
```
The result:

![](https://tb-pic-bed.oss-cn-beijing.aliyuncs.com/blog/%7BE37F027A-6B0E-45e4-806C-FFE6318C7D13%7D.png)

# Format of the Input file
The flex input file consists of three sections, separated by a line containing only ‘%%’.
```
definitions
%%
rules
%%
user code
```
# Match
When the scanner is run, it begins to look for **strings that match any of its pattern**s. If there are **more than one match**, it matches the one **matching the most text**. If there are **two or more matches of the same length**, the rule listed **first** in the flex input file is chosen.

> Once the match determined, the token(text corresponding to the match) is made available in global character pointer `yytext`, and its length in the global integer `yyleng`. The _Action_ corresponded to the matched pattern is the executed.

Note that `yytext` can be defined in two ways:
- as a character *pointer*.
- as a character *array*.

You can make this definition in the `definition` part of the flex file by including one of the special directives `%pointer%` or `%array`. The default is `%pointer`.

# Action
The action of each pattern can be any arbitrary C statement. And of course it can be empty too which means the input token is discarded.
for example:
```
%%
"zap me"
```
When the pattern above is matched, this example will just copy all characters in the input to the output.

There are some type of actions:
```
%%
pattern1 putchar(' ');
pattern2 /* ignore this token */
pattern3 { /* C statement */ }
```

Next we will introduce some special actions:
- **|**: An action consists only of a vertical bar('|') means "same as the action of the next rule". For example 
```
%%
a        |
ab       |
abc      |
abcd     ECHO; REJECT;
.|\n     /* eat up any unmatched character */
```
The first three rules share the fourth`s action since they use the special '|' action.

- **ECHO**: copies `yytext` to the scanners' output.

- **BEGIN**: 

- **REJECT**:

- **yymore()**:

