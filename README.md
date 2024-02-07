<!-- Improved compatibility of back to top link: See: https://github.com/othneildrew/Best-README-Template/pull/73 -->

<a name="readme-top"></a>

<!-- PROJECT SHIELDS -->
<!--
*** I'm using markdown "reference style" links for readability.
*** Reference links are enclosed in brackets [ ] instead of parentheses ( ).
*** See the bottom of this document for the declaration of the reference variables
*** for contributors-url, forks-url, etc. This is an optional, concise syntax you may use.
*** https://www.markdownguide.org/basic-syntax/#reference-style-links
-->

<!-- PROJECT LOGO -->
<br />
<div align="center">
  <a href="https://family-flix.github.io/docs/">
    <img src="assets/logo.jpg" alt="Logo" width="80" height="100">
  </a>

  <h3 align="center">FamilyFlix</h3>

  <p align="center">
    视频刮削 + 云盘管理 + 自动更新 + 在线观看
    <br />
    <a href="https://family-flix.github.io/docs/"><strong>Explore the docs »</strong></a>
    <br />
    <br />
    <!-- <a href="https://github.com/othneildrew/Best-README-Template">View Demo</a> -->
    <!-- · -->
    <a href="https://github.com/family-flix/api/issues">Report Bug</a>
    ·
    <a href="https://github.com/family-flix/api/issues">Request Feature</a>
  </p>
</div>

<!-- TABLE OF CONTENTS -->
<!-- <details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about-the-project">About The Project</a>
      <ul>
        <li><a href="#built-with">Built With</a></li>
      </ul>
    </li>
    <li>
      <a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#prerequisites">Prerequisites</a></li>
        <li><a href="#installation">Installation</a></li>
      </ul>
    </li>
    <li><a href="#usage">Usage</a></li>
    <li><a href="#roadmap">Roadmap</a></li>
    <li><a href="#contributing">Contributing</a></li>
    <li><a href="#license">License</a></li>
    <li><a href="#contact">Contact</a></li>
    <li><a href="#acknowledgments">Acknowledgments</a></li>
  </ol>
</details> -->

<!-- ABOUT THE PROJECT -->

## ⭐️ 概览

![管理后台首页](assets/admin-home.png)

<!-- [![管理后台首页][assets/admin-home.png]](https://docs.family-flix.github.com)
[![移动端1][assets/mobile-example1.png]](https://docs.family-flix.github.com)
[![移动端2][assets/mobile-example2.png]](https://docs.family-flix.github.com) -->

本项目的初衷，是提供一个简单、方便的追剧工具，简单到不怎么会用手机的中老年也能使用。
最终的方案是一些复杂的操作由应用维护者来做；视频观看方，只需要在微信里点开视频链接就能观看，无需下载安装 App、无需搜索、没有广告、不占手机空间。

![移动端1](assets/mobile-example1.png)
![移动端2](assets/mobile-example2.png)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## ✨ 功能

- 🌈 索引云盘文件刮削影视剧信息
- 🚀 自动追踪影视剧更新并同步至云盘
- 📦 微信内在线观看云盘视频、记录观看历史

## 👀 使用前须知

该项目**「不提供影视剧资源」**，使用该项目前，你必须有

- 存储了影视剧文件的云盘（目前仅支持阿里云盘）
- 能够抓包查看网络请求、安装了阿里云盘的手机
- 下面两个二选一
  - 要求外网可以访问，需要一台可以公网访问的服务器（性能要求低，视频播放直接走阿里云盘不占服务器流量）
  - 只在家庭范围内使用，一台电脑即可

## 🖥️ 部署

### Docker 部署

暂定

### 源码部署

> 要求 `NodeJs` 版本大于 `16.18.0`。

在 [https://github.com/family-flix/api/releases](https://github.com/family-flix/api/releases) 下载最新源码

将源码解压至文件夹，修改文件夹内 `.env.template` 文件内环境变量，指定数据库、海报封面等文件的存放路径，并将文件名修改为 `.env`。

```txt
OUTPUT_PATH=/Users/your_name/Documents/workspaces/family-flix/output
# 填入自己的 TMDB_TOKEN
TMDB_TOKEN=xxxx
```

随后安装依赖。依赖安装成功后，初始化数据库

```bash
yarn prisma migrate apply
```

当数据库初始化完成后，执行 `yarn start` 即可启动项目。

在控制台会打印网站访问地址，在浏览器中访问即可。共有三个应用

- http://127.0.0.1:3200/admin/home/index 管理后台
- http://127.0.0.1:3200/mobile/home/index 视频播放移动端
- http://127.0.0.1:3200/pc/home/index 视频播放 PC 端

添加云盘、刮削等操作可以参考文档。<a href="https://family-flix.github.io/docs/"><strong>Explore the docs »</strong></a>

## API 文档

- [管理后台 API](https://documenter.getpostman.com/view/7312751/2s93sXdEzv)
- [视频播放 API](https://documenter.getpostman.com/view/7312751/2s93sXdF5R)

## 相关项目

- [视频播放移动端](https://github.com/family-flix/mobile1)
- [视频播放 PC 端](https://github.com/family-flix/pc2)
- [管理后台](https://github.com/family-flix/admin1)
