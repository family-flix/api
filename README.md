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

[![Contributors][contributors-shield]][contributors-url]
[![Forks][forks-shield]][forks-url]
[![Stargazers][stars-shield]][stars-url]
[![Issues][issues-shield]][issues-url]
[![MIT License][license-shield]][license-url]
[![LinkedIn][linkedin-shield]][linkedin-url]

<!-- PROJECT LOGO -->
<br />
<div align="center">
  <a href="https://github.com/othneildrew/Best-README-Template">
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
    ·
    <a href="https://github.com/family-flix/api/issues">Report Bug</a>
    ·
    <a href="https://github.com/family-flix/api/issues">Request Feature</a>
  </p>
</div>

<!-- TABLE OF CONTENTS -->
<details>
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
</details>

<!-- ABOUT THE PROJECT -->

## ⭐️ About The Project

[![管理后台首页][assets/admin-home.png]](https://docs.family-flix.github.com)
[![移动端1][assets/mobile-example1.png]](https://docs.family-flix.github.com)
[![移动端2][assets/mobile-example2.png]](https://docs.family-flix.github.com)

There are many great README templates available on GitHub; however, I didn't find one that really suited my needs so I created this enhanced one. I want to create a README template so amazing that it'll be the last one you ever need -- I think this is it.

Here's why:

- Your time should be focused on creating something amazing. A project that solves a problem and helps others
- You shouldn't be doing the same tasks over and over like creating a README from scratch
- You should implement DRY principles to the rest of your life :smile:

Of course, no one template will serve all projects since your needs may be different. So I'll be adding more in the near future. You may also suggest changes by forking this repo and creating a pull request or opening an issue. Thanks to all the people have contributed to expanding this template!

Use the `BLANK_README.md` to get started.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## ✨ 功能

- 🌈 索引云盘文件刮削影视剧信息
- 💅 在线观看云盘视频、记录观看历史
- 🚀 自动追踪影视剧更新并同步至云盘，追剧更快更简单
- 📦 无需下载 App 在微信内点开即看

4.

## 使用前须知

该项目**「不提供影视剧资源」**，它的核心功能是根据云盘内的影视剧文件名字在 `TMDB` 上搜索对应影视剧的海报、描述等信息。使用该项目前，你必须有

1. 存储了影视剧文件的云盘（目前仅支持阿里云盘）
2. 能够抓包查看网络请求、安装了阿里云盘的手机
3. 下面两个二选一
   - 3.1 要求外网可以访问，需要一台可以公网访问的服务器（性能要求低，视频播放直接走阿里云盘不占服务器流量）
   - 3.2 只在局域网内使用，一台电脑即可

满足条件后，可看该文档[安装、运行](https://www.yuque.com/u7327/lm76f6)

## Docker 部署

```bash
docker build -t flix .
```

端口为 8000，数据库等文件夹路径为 `/output`

```bash
docker run -d -v /local/output:/output -p 8000:8000 --name flix.prod flix
```

## 运行

`clone` 项目后安装依赖，执行 `node scripts/ncc.js`。然后 `yarn dev` 就可以了。

<!-- ## 单元测试

先生成 `db` 文件

```bash
DATABASE_PATH=file://$PWD/domains/__tests__/output/data/family-flix.db yarn prisma db push
``` -->

<!-- ## 效果预览

### 管理后台

![管理后台](assets/family-flix-preview03.png)

### 视频播放移动端

![视频播放移动端](assets/family-flix-preview02.png)

### 视频播放 PC 端

![视频播放 PC 端](assets/family-flix-preview01.png)

## API 文档

1. [管理后台 API](https://documenter.getpostman.com/view/7312751/2s93sXdEzv)
2. [视频播放 API](https://documenter.getpostman.com/view/7312751/2s93sXdF5R)

## 前端项目

1. [视频播放移动端](https://github.com/family-flix/mobile1)
2. [视频播放 PC 端](https://github.com/family-flix/pc2)
3. [管理后台](https://github.com/family-flix/admin1) -->
