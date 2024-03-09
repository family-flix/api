# 云盘客户端测试

## 创建测试用数据

指定一个「阿里云盘」的分享资源路径和文件夹 id，遍历该文件夹并复刻一致的文件树。

### 剧集 + 封面 + 海报 + 字幕

https://www.alipan.com/s/mS7cQVvDBpF

### 剧集 + 封面 + 海报 + 字幕 + 刮削信息

请回答1988
https://www.aliyundrive.com/s/NamVipF3sG7

### 多季 + 剧集 + 封面 + 海报 + 刮削信息

https://www.aliyundrive.com/s/eLTL3CTX64x

### 电影集合 + 刮削信息

https://www.aliyundrive.com/s/bG6kLQZdfqP

## 小视频文件

使用 `ffmpeg` 创建视频文件，占用空间小、创建速度快。

```bash
ffmpeg -f lavfi -i color=c=black:s=10x10:d=1 -c:v libx264 -pix_fmt yuv420p template_video.mp4
```

`-f lavfi` 指定使用 `libavfilter` 输入格式
`-i color=c=black:s=10x10` 使用 color 源生成黑色画面，尺寸为 10x10 像素
`-t 2` 设置输出视频时长为 2 秒
