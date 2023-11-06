# GithubPage + Hugo博客配置教程（主题：LoveIt）


# 前言
折腾了半天，碰到了很多地雷和坑:face_with_head_bandage:。最后终于是完成了博客网站的创建。所以决定将整个配置流程以及可能遇到问题总结一下。于是有了这个网站的第一篇博客。:grin::grin:

## 0 基础介绍
### 0.1 什么是Github Pages？
[Github Pages](https://pages.github.com/) 是一个可以从你的 Github 源码仓库中直接生成个人、组织或者项目页面的静态站点托管服务。
这些静态网页的托管和发布依托于Github，故称之为GithubPages.
### 0.2 什么是Hugo?
[Hugo](https://gohugo.io/) 是一个用 Go 编写的快速静态网站生成器，具有极快的构建速度（每个页面小于1毫秒），拥有大量现成主题，在开发过程中通过 liveload 即时渲染更改，可以托管在任何平台，是一个理想的建站工具。
### 0.3 网站总体搭建思路
1. 创建两个github仓库：
  - **源码仓库**：储存博客源代码及数据。
  - **GithubPages仓库**：储存静态网页，并部署。

2. 将在**源码仓库**中配置得到的静态网站文件部署到**GitHubPages仓库**中。 

### 前置能力
{{< admonition type=note title="这篇教程假设你已经：" open=true >}}
1. 了解`Git`的基本知识并能使用。
2. 有Github仓库并熟悉基础使用
3. 了解一定的终端命令行知识
{{< /admonition >}}

# 正题
## 预备工作
首先，我使用的是Hugo v0.92.2+extend版本。主题为[LoveIt]^(选了好久)。
> 主题的仓库在这：`https://github.com/dillonzq/LoveIt`

接下来就进入正式的流程环节：
首先，我选择的方法是**使用Hugo在本地配置静态网站**后再推送到github上进行build以及部署，因此在这里我只会讲这种方法。当然还可以利用Git Action的workflow来在github上动态进行网站的配置和部署，因为我暂时没用这个方法，因此在这里不作介绍。

### 1 创建仓库
我推荐创建两个github仓库，一个private仓库用来存放Hugo site的文件，另一个public仓库存放静态网站的文件，这样的话方便文件的管理。

我们首先来创建第一个private仓库：

{{< image src="images/hugo-blog-tutorial/01rep.png" height=700 >}}

创建完成后先不要管，
然后是第二个仓库：
{{< image src="images/hugo-blog-tutorial/02rep.png" height=400 >}}

{{< admonition type=note title="注意" open=true >}}
`<username>.github.io`的仓库名称的要求需要满足。
{{< /admonition >}}

## 流程
### 2 初始化Hugo site
首先，克隆刚刚创建的准备存放博客源文件的private仓库。

然后，进入该仓库（我的是blogsite），使用命令`hugo new site xxxx`得到一个新的hugo site框架。
如图：
{{< image src="images/hugo-blog-tutorial/newsite.png" height=280 >}}
紧接着进入刚刚创建的new site，我们可以看到，其基本框架如下所示：
{{< image src="images/hugo-blog-tutorial/sitearch.png" height=200 >}}

各文件夹解释如下：
- **archetypes**：存放用 hugo 命令新建的 md 文件应用的 front matter 模版
- **content**：存放内容页面，如 Blog
- **layouts**：存放定义网站的样式，写在layouts文件下的样式会覆盖安装的主题中的 layouts文件同名的样式
- **static**：存放所有静态文件，如图片
- **data**：存放创建站点时 Hugo 使用的其他数据
- **public**：存放 Hugo 生成的静态网页
- **themes**：存放主题文件
- **config.toml**：网站配置文件

### 3 下载并配置Hugo主题
#### 3.1 下载Hugo主题
你可以在[Hugo 社区](https://themes.gohugo.io/)或者其它github仓库中自行选择你喜欢的主题，并进行相应的配置。

但需要注意的是，你要弄清楚**相应主题与你使用的Hugo的版本的适配情况**（血的教训）:cry::cry:。

我们下面进入刚刚创建的site目录，然后使用下面命令下载主题的相关文件。
```bash
# 位于你的site根目录
git clone https://github.com/dillonzq/LoveIt.git themes/LoveIt
```

下载完成之后，相应的主题内容会被下载到themes文件夹下，如图：
{{< image src="images/hugo-blog-tutorial/newloveit.png" height=650 >}}

#### 3.2 配置Hugo主题
不用太关注主题文件的细节（除非想学）。
简单的话只要看`exampleSite`文件夹，这个文件夹一般就是你在参考网站时的demo，因此我们可以直接利用这个文件夹来搭起我们网站的结构。

{{< image src="images/hugo-blog-tutorial/example.png" height=140 >}}

如何做？**将exampleSite中的文件复制到site根目录下（重复的目录需要覆盖）**。推荐这么做的原因是我们直接就能利用demo建立起自己可以运行的网站框架，后续只需要对demo进行修修改改即可。

移动后的根目录如下图所示：

{{< image src="images/hugo-blog-tutorial/moveddir.png" height=280 >}}

其中，复制`config.toml`的时候需要注意：
1. **themes**：修改themes参数为`themesDir: "themes"`，这是指明你的theme存放的位置。
2. **baseURL**：没有自己自定义域名的话，修改为`baseURL = "https://<username>.github.io"`，将username修改为你自己的github用户名。

{{< admonition type=note title="注意事项" open=true >}}
在进行第四步之前，先删除`content/posts/theme-documentation-built-in-shortcodes`文件夹中两个index文件内容的tweet部分，不然会报错。（下面的步骤我嫌麻烦直接把文件夹删了）
{{< /admonition >}}

### 4 本地运行测试
经过以上步骤后，即可以进行本地运行，让我们来看一看现在的网站样子。

使用命令`hugo server`即可在本地运行，默认在`1313`端口。

当然也可以指定端口运行：`hugo server -p 8888`。

如图：

{{< image src="images/hugo-blog-tutorial/runeg.png" height=280 >}}

运行界面如下：

{{< image src="images/hugo-blog-tutorial/egweb.png" height=400 >}}

### 5 部署
部署在对应网址`https://<username>.github.io/`的方法也很简单，总共分为两步。

1. 利用`hugo`命令得到配置的静态文件：

{{< image src="images/hugo-blog-tutorial/hugo.png" height=280 >}}
运行完这个命令后，你会发现site的根目录下出现了一个`public`文件夹，这就是hugo运行所配置成功的静态网站文件，也就是我们要存放在刚刚创建的`<username>.github.io`的github仓库中文件。

2. 将public目录中的文件上传至对应Github仓库。

命令如下：
```bash
# 进入public目录
cd public
# 初始化git仓库
git init -b main
# 连接远程仓库
git remote add origin https://github.com/HIT0638/HIT0638.github.io.git
# 先将原本的内容同步
git pull --rebase origin main
# 然后触发连招
git add .
git commit -m 'xxx'
git push origin main
```

一顿操作猛如虎后，就成功将public中的文件上传到了github仓库中去。
接下来我们打开仓库页面的`Action`，可以看到以下内容：
{{< image src="images/hugo-blog-tutorial/action.png" height=120 >}}

如果为绿色勾，则代表部署成功，然后我们就可以进入`https://<username>.github.io/`看到网页的内容啦！

### 6 后续
还记得第一个创建的private仓库吗？
现在轮到它登场了，我们用它保存我们的源文件，故在其`.gitignore`下忽略掉`public`中的内容，然后`push`到仓库中去即可。

#### 6.1 周而复始的生活
再次以后，每当需要更新网站时，就只需要重复以下步骤：
1. 更新内容
2. `hugo`更新public文件
3. 将public文件上传到GitPage仓库
4. 同步更新源文件仓库

即可。

## 更多相关的用法笔记
待更新...

# 结语
在自己动手尝试的过程中，可能会遇到各种各样的错误和问题，也经常会出现"怎么照着做也会错"的情况。

每个人都是如此。但只要有不怕挫折，勇于钻研问题的精神和毅力，无论任何艰难险阻都能克服。
