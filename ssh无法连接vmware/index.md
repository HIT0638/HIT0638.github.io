# Ssh无法连接Vmware-Ubuntu虚拟机问题解决


## 解决方案
当然，每个人碰到的问题和解决方案可能会不一样，在这里我给出我的解决方案。  
首先，我的windows主机以及vmware-ubuntu虚拟机的相关网络工具是正常的，包括：
- ssh已安装
- 防火墙关闭/允许22端口
- 在前一天还能够ssh连接，但是异常关闭后今天不行。

然后下面就是我的解决步骤：
1.首先查看虚拟机的ip地址，记录其子网掩码以及对应的地址。  
![](https://tb-pic-bed.oss-cn-beijing.aliyuncs.com/blog/20240415110632.png)

2.确认虚拟机网络适配器设置为NAT。  
![](https://tb-pic-bed.oss-cn-beijing.aliyuncs.com/blog/20240415110808.png)

对于使用NAT模式的虚拟机，其使用的虚拟网卡在宿主机上为：VMnet8，如图：  
![](https://tb-pic-bed.oss-cn-beijing.aliyuncs.com/blog/20240415111035.png)

3.右键上图的Vmnet8网卡，点击"属性"并作如下配置：  
![](https://tb-pic-bed.oss-cn-beijing.aliyuncs.com/blog/20240415111218.png)  
双击TCP/IPv4选项，进入并修改对应设置。填入的IP地址以及掩码参照步骤1中得到的对应地址和掩码。

4.观察虚拟机设置，确保步骤3中填写数据与对应IP地址、子网掩码、默认网关、默认DNS地址一致。  
![](https://tb-pic-bed.oss-cn-beijing.aliyuncs.com/blog/20240415111833.png)

5.尝试ping，ssh连接虚拟机，完成。  
![](https://tb-pic-bed.oss-cn-beijing.aliyuncs.com/blog/20240415111931.png)

![](https://tb-pic-bed.oss-cn-beijing.aliyuncs.com/blog/20240415112053.png)

