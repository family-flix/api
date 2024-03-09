/**
 * @file 给指定盘添加测试用的文件，模拟真实文件树
 * 数据参考 readme.md
 */
import path from "path";
import os from "os";

import { Application } from "@/domains/application/index";
import { Folder } from "@/domains/folder/index";
import { LocalFileDriveClient } from "@/domains/clients/local";
import { FakeDatabaseStore } from "@/domains/store/fake";
import { NfoFileProcessor } from "@/domains/file_processor/nfo";

const template_video = path.resolve(process.cwd(), "public/template_video.mp4");
const template_img = path.resolve(process.cwd(), "public/template_img.jpg");
const template_subtitle = path.resolve(process.cwd(), "public/template_subtitle.vtt");

(async () => {
  const store = new FakeDatabaseStore();
  const dir = path.resolve(os.homedir(), "Documents");
  const r = await LocalFileDriveClient.Get({
    unique_id: dir,
  });
  if (r.error) {
    console.log(r.error.message);
    return;
  }
  const client = r.data;
  const root_folder = client.root_folder;
  if (!root_folder) {
    console.log("云盘没有索引根目录");
    return;
  }
  const parser = new NfoFileProcessor({
    file_id: "",
    client,
  });
  const content = `<?xml version="1.0" encoding="utf-8" standalone="yes"?>
<tvshow>
<plot>该剧根据轰动一时的印度黑公交轮奸案改编。2012年12月，23岁就读于印度德里大学医学系女大学生，在与男友看完电影回家时，他们误上了一辆不在当班的公交车，公交车上6名男子将其男友围殴后关押在驾驶室，然后将其拉到车厢后轮奸。此事造成印度全国震怒。该剧描述调查警员瓦提卡·恰德维帝如何坚持不懈地追捕涉案疑凶。然而，这次行动不仅关乎公众利益。</plot>
<outline>该剧根据轰动一时的印度黑公交轮奸案改编。2012年12月，23岁就读于印度德里大学医学系女大学生，在与男友看完电影回家时，他们误上了一辆不在当班的公交车，公交车上6名男子将其男友围殴后关押在驾驶室，然后将其拉到车厢后轮奸。此事造成印度全国震怒。该剧描述调查警员瓦提卡·恰德维帝如何坚持不懈地追捕涉案疑凶。然而，这次行动不仅关乎公众利益。</outline>
<lockdata>false</lockdata>
<dateadded>2022-11-08 19:35:54</dateadded>
<title>德里罪案</title>
<originaltitle>Delhi Crime</originaltitle>
<rating>7.846</rating>
<year>2019</year>
<mpaa>TV-MA</mpaa>
<imdb_id>tt9398466</imdb_id>
<tmdbid>87508</tmdbid>
<premiered>2019-03-22</premiered>
<releasedate>2019-03-22</releasedate>
<runtime>60</runtime>
<genre>犯罪</genre>
<studio>Netflix</studio>
<tag>delhi, india</tag>
<tag>investigation</tag>
<tag>gang rape</tag>
<tag>true crime</tag>
<tvdbid>360860</tvdbid>
<art>
<poster>/sharealiyun/剧集-亚洲/德里罪案/folder.jpg</poster>
<fanart>/sharealiyun/剧集-亚洲/德里罪案/backdrop1.jpg</fanart>
</art>
<actor>
<name>Shefali Shah</name>
<role>Vartika Chaturvedi</role>
<type>Actor</type>
<sortorder>0</sortorder>
<thumb>/config/metadata/People/S/Shefali Shah/folder.jpg</thumb>
</actor>
<actor>
<name>Rasika Dugal</name>
<role>Neeti Singh</role>
<type>Actor</type>
<sortorder>1</sortorder>
<thumb>/config/metadata/People/R/Rasika Dugal/folder.jpg</thumb>
</actor>
<actor>
<name>Avijit Dutt</name>
<role>Gururaj Dixit</role>
<type>Actor</type>
<sortorder>4</sortorder>
<thumb>/config/metadata/People/A/Avijit Dutt/folder.jpg</thumb>
</actor>
<actor>
<name>Adil Hussain</name>
<role>Kumar Vijay</role>
<type>Actor</type>
<sortorder>5</sortorder>
<thumb>/config/metadata/People/A/Adil Hussain/folder.jpg</thumb>
</actor>
<actor>
<name>Yashaswini Dayama</name>
<role>Chandni</role>
<type>Actor</type>
<sortorder>6</sortorder>
<thumb>/config/metadata/People/Y/Yashaswini Dayama/folder.jpg</thumb>
</actor>
<actor>
<name>Rajesh Tailang</name>
<role>Bhupendra Singh</role>
<type>Actor</type>
<sortorder>7</sortorder>
<thumb>/config/metadata/People/R/Rajesh Tailang/folder.jpg</thumb>
</actor>
<actor>
<name>Denzil Smith</name>
<role>Vishal Chaturvedi</role>
<type>Actor</type>
<sortorder>10</sortorder>
<thumb>/config/metadata/People/D/Denzil Smith/folder.jpg</thumb>
</actor>
<actor>
<name>Sidharth Bhardwaj</name>
<role>SHO Subhash Gupta</role>
<type>Actor</type>
<sortorder>12</sortorder>
<thumb>/config/metadata/People/S/Sidharth Bhardwaj/folder.jpg</thumb>
</actor>
<actor>
<name>Anuraag Arora</name>
<role>Jairaj</role>
<type>Actor</type>
<sortorder>13</sortorder>
</actor>
<actor>
<name>Danish Husain</name>
<role>Vineet Singh</role>
<type>Actor</type>
<sortorder>14</sortorder>
<thumb>/config/metadata/People/D/Danish Husain/folder.jpg</thumb>
</actor>
<actor>
<name>Tillotama Shome</name>
<role>Lata Solanki</role>
<type>Actor</type>
<sortorder>15</sortorder>
<thumb>/config/metadata/People/T/Tillotama Shome/folder.jpg</thumb>
</actor>
<actor>
<name>Jatin Goswami</name>
<role>Babloo</role>
<type>Actor</type>
<sortorder>16</sortorder>
<thumb>/config/metadata/People/J/Jatin Goswami/folder.jpg</thumb>
</actor>
<id>360860</id>
<episodeguide>
<url cache="360860.xml">http://www.thetvdb.com/api/1D62F2F90030C444/series/360860/all/zh.zip</url>
</episodeguide>
<season>-1</season>
<episode>-1</episode>
<status>Continuing</status>
</tvshow>`;
  const content2 = `<?xml version="1.0" encoding="utf-8" standalone="yes"?>
<season>
  <plot>一桩强暴案件震惊了整个德里，副警务处长瓦尔迪卡·查图尔维迪展开对凶犯的艰苦搜寻。灵感来自 2012 年印度黑公交轮奸案。</plot>
  <outline>一桩强暴案件震惊了整个德里，副警务处长瓦尔迪卡·查图尔维迪展开对凶犯的艰苦搜寻。灵感来自 2012 年印度黑公交轮奸案。</outline>
  <lockdata>false</lockdata>
  <dateadded>2022-11-08 19:35:54</dateadded>
  <title>第 1 季</title>
  <writer>Richie Mehta</writer>
  <credits>Richie Mehta</credits>
  <year>2019</year>
  <sorttitle>第 1 季</sorttitle>
  <premiered>2019-03-22</premiered>
  <releasedate>2019-03-22</releasedate>
  <art>
    <poster>/sharealiyun/剧集-亚洲/德里罪案/S01/folder.jpg</poster>
  </art>
  <actor>
    <name>Shefali Shah</name>
    <role>Vartika Chaturvedi</role>
    <type>Actor</type>
    <thumb>/config/metadata/People/S/Shefali Shah/folder.jpg</thumb>
  </actor>
  <actor>
    <name>Rasika Dugal</name>
    <role>Neeti Singh</role>
    <type>Actor</type>
    <thumb>/config/metadata/People/R/Rasika Dugal/folder.jpg</thumb>
  </actor>
  <actor>
    <name>Sanjay Bishnoi</name>
    <role>Akash</role>
    <type>Actor</type>
  </actor>
  <actor>
    <name>Swati Bhatia</name>
    <role>Ira</role>
    <type>Actor</type>
  </actor>
  <actor>
    <name>Avijit Dutt</name>
    <role>Gururaj Dixit</role>
    <type>Actor</type>
    <thumb>/config/metadata/People/A/Avijit Dutt/folder.jpg</thumb>
  </actor>
  <actor>
    <name>Adil Hussain</name>
    <role>Kumar Vijay</role>
    <type>Actor</type>
    <thumb>/config/metadata/People/A/Adil Hussain/folder.jpg</thumb>
  </actor>
  <actor>
    <name>Yashaswini Dayama</name>
    <role>Chandni</role>
    <type>Actor</type>
    <thumb>/config/metadata/People/Y/Yashaswini Dayama/folder.jpg</thumb>
  </actor>
  <actor>
    <name>Rajesh Tailang</name>
    <role>Bhupendra Singh</role>
    <type>Actor</type>
    <thumb>/config/metadata/People/R/Rajesh Tailang/folder.jpg</thumb>
  </actor>
  <actor>
    <name>Jaya Bhattacharya</name>
    <role>Vimla Bharadwaj</role>
    <type>Actor</type>
  </actor>
  <actor>
    <name>Gopal Datt</name>
    <role>Sudhir Kumar</role>
    <type>Actor</type>
  </actor>
  <actor>
    <name>Denzil Smith</name>
    <role>Vishal Chaturvedi</role>
    <type>Actor</type>
    <thumb>/config/metadata/People/D/Denzil Smith/folder.jpg</thumb>
  </actor>
  <actor>
    <name>Mridul Sharma</name>
    <role>Jai Singh</role>
    <type>Actor</type>
  </actor>
  <actor>
    <name>Sidharth Bhardwaj</name>
    <role>SHO Subhash Gupta</role>
    <type>Actor</type>
    <thumb>/config/metadata/People/S/Sidharth Bhardwaj/folder.jpg</thumb>
  </actor>
  <actor>
    <name>Toby Bruce</name>
    <role>Producer</role>
    <type>Producer</type>
  </actor>
  <actor>
    <name>Jeff Sagansky</name>
    <role>Executive Producer</role>
    <type>Producer</type>
  </actor>
  <actor>
    <name>David A. Stern</name>
    <role>Executive Producer</role>
    <type>Producer</type>
  </actor>
  <actor>
    <name>Florence Sloan</name>
    <role>Executive Producer</role>
    <type>Producer</type>
  </actor>
  <actor>
    <name>Pooja Kohli</name>
    <role>Executive Producer</role>
    <type>Producer</type>
  </actor>
  <actor>
    <name>Kilian Kerwin</name>
    <role>Executive Producer</role>
    <type>Producer</type>
  </actor>
  <actor>
    <name>Laurence Bowen</name>
    <role>Producer</role>
    <type>Producer</type>
  </actor>
  <actor>
    <name>Michael Hogan</name>
    <role>Executive Producer</role>
    <type>Producer</type>
  </actor>
  <actor>
    <name>John Penotti</name>
    <role>Executive Producer</role>
    <type>Producer</type>
  </actor>
  <actor>
    <name>Apoorva Bakshi</name>
    <role>Executive Producer</role>
    <type>Producer</type>
  </actor>
  <actor>
    <name>Sanjay Bachani</name>
    <role>Executive Producer</role>
    <type>Producer</type>
  </actor>
  <actor>
    <name>Aaron Kaplan</name>
    <role>Executive Producer</role>
    <type>Producer</type>
  </actor>
  <seasonnumber>1</seasonnumber>
</season>`;
  const content3 = `<?xml version="1.0" encoding="utf-8" standalone="yes"?>
<episodedetails>
  <plot><![CDATA[善宇和宝拉恋爱的事情传开了，使得胡同里一片翻天覆地。再见双门洞，进入到胡同内的一辆搬家车，最先离开双门洞的家族是？那个时节 家族的爱，邻居间的温暖，青春的灿烂，初恋的心疼，悸动，幸福。带着这一切，时间回到现实之中，只祈愿这时光是温暖的。]]></plot>
  <outline />
  <lockdata>false</lockdata>
  <dateadded>2021-10-03 05:43:20</dateadded>
  <title>再见我的青春&amp;双门洞</title>
  <director>Shin Won-ho</director>
  <rating>9.2</rating>
  <year>2016</year>
  <imdbid>tt5445452</imdbid>
  <tvdbid>5471511</tvdbid>
  <runtime>121</runtime>
  <genre>Comedy</genre>
  <genre>Drama</genre>
  <genre>Family</genre>
  <uniqueid type="Tvdb">5471511</uniqueid>
  <uniqueid type="Imdb">tt5445452</uniqueid>
  <episode>20</episode>
  <season>1</season>
  <aired>2016-01-16</aired>
  <fileinfo>
    <streamdetails>
      <video>
        <codec>h264</codec>
        <micodec>h264</micodec>
        <bitrate>15944449</bitrate>
        <width>1920</width>
        <height>1080</height>
        <aspect>16:9</aspect>
        <aspectratio>16:9</aspectratio>
        <framerate>23.976025</framerate>
        <scantype>progressive</scantype>
        <default>True</default>
        <forced>False</forced>
        <duration>121</duration>
        <durationinseconds>7272</durationinseconds>
      </video>
      <audio>
        <codec>dts</codec>
        <micodec>dts</micodec>
        <bitrate>1536000</bitrate>
        <language>kor</language>
        <scantype>progressive</scantype>
        <channels>2</channels>
        <samplingrate>48000</samplingrate>
        <default>True</default>
        <forced>False</forced>
      </audio>
      <subtitle>
        <codec>PGSSUB</codec>
        <micodec>PGSSUB</micodec>
        <language>chi</language>
        <scantype>progressive</scantype>
        <default>True</default>
        <forced>False</forced>
      </subtitle>
      <subtitle>
        <codec>PGSSUB</codec>
        <micodec>PGSSUB</micodec>
        <language>chi</language>
        <scantype>progressive</scantype>
        <default>False</default>
        <forced>False</forced>
      </subtitle>
    </streamdetails>
  </fileinfo>
</episodedetails>`;
  const content4 = `<?xml version="1.0" encoding="utf-8" standalone="yes"?>
<tvshow>
  <plot><![CDATA[　　《请回答1988》为韩国tvN自2015年10月30日起播出的金土连续剧，由《请回答1997》、《请回答1994》制作班底申元浩导演和李祐汀作家再度携手合作。此剧与以往将初恋作为重心的另两部同系列作品不同，将以家族 关系和邻里感情作为剧情主轴。而且1988年也是香港电影的巅峰时期，张国荣、周润发等影星在韩国皆具有高知名度，因此也可能被列为剧情素材之一。]]></plot>
  <outline><![CDATA[　　《请回答1988》为韩国tvN自2015年10月30日起播出的金土连续剧，由《请回答1997》、《请回答1994》制作班底申元浩导演和李祐汀作家再度携手合作。此剧与以往将初恋作为重心的另两部同系列作品不同，将以家族 关系和邻里感情作为剧情主轴。而且1988年也是香港电影的巅峰时期，张国荣、周润发等影星在韩国皆具有高知名度，因此也可能被列为剧情素材之一。]]></outline>
  <lockdata>false</lockdata>
  <dateadded>2021-08-08 19:34:57</dateadded>
  <title>请回答1988</title>
  <originaltitle>응답하라 1988</originaltitle>
  <actor>
    <name>Lee Hye-ri</name>
    <role>Sung Deok-sun</role>
    <type>Actor</type>
    <tmdbid>1413827</tmdbid>
  </actor>
  <actor>
    <name>Ryu Jun-yeol</name>
    <role>Kim Jung-hwan</role>
    <type>Actor</type>
    <tmdbid>1530733</tmdbid>
  </actor>
  <actor>
    <name>Park Bo-gum</name>
    <role>Choi Taek</role>
    <type>Actor</type>
    <tmdbid>587634</tmdbid>
  </actor>
  <actor>
    <name>Go Kyung-pyo</name>
    <role>Sung Sun-woo</role>
    <type>Actor</type>
    <tmdbid>1257601</tmdbid>
  </actor>
  <actor>
    <name>Lee Dong-hwi</name>
    <role>Ryu Dong-ryong</role>
    <type>Actor</type>
    <tmdbid>1418580</tmdbid>
  </actor>
  <actor>
    <name>Ryu Hye-young</name>
    <role>Sung Bo-ra</role>
    <type>Actor</type>
    <tmdbid>1386540</tmdbid>
  </actor>
  <actor>
    <name>Choi Sung-won</name>
    <role>Sung No-eul</role>
    <type>Actor</type>
    <tmdbid>1530744</tmdbid>
  </actor>
  <actor>
    <name>Ahn Jae-hong</name>
    <role>Kim Jung-bong</role>
    <type>Actor</type>
    <tmdbid>1164507</tmdbid>
  </actor>
  <actor>
    <name>Kim Seol</name>
    <role>Sung Jin-ju</role>
    <type>Actor</type>
    <tmdbid>1876418</tmdbid>
  </actor>
  <actor>
    <name>Sung Dong-il</name>
    <role>Sung Dong-il</role>
    <type>Actor</type>
    <tmdbid>1020859</tmdbid>
  </actor>
  <actor>
    <name>Lee Il-hwa</name>
    <role>Lee Il-hwa</role>
    <type>Actor</type>
    <tmdbid>1348579</tmdbid>
  </actor>
  <actor>
    <name>Kim Sung-kyun</name>
    <role>Kim Sung-kyun</role>
    <type>Actor</type>
    <tmdbid>1024396</tmdbid>
  </actor>
  <actor>
    <name>Ra Mi-ran</name>
    <role>Ra Mi-ran</role>
    <type>Actor</type>
    <tmdbid>980225</tmdbid>
  </actor>
  <actor>
    <name>Choi Moo-seong</name>
    <role>Choi Moo-seong</role>
    <type>Actor</type>
    <tmdbid>240081</tmdbid>
  </actor>
  <actor>
    <name>Kim Sun-young</name>
    <role>Kim Sun-young</role>
    <type>Actor</type>
    <tmdbid>1352930</tmdbid>
  </actor>
  <actor>
    <name>Yoo Jae-myung</name>
    <role>Ryu Jae-myung</role>
    <type>Actor</type>
    <tmdbid>1336804</tmdbid>
  </actor>
  <actor>
    <name>Lee Min-ji</name>
    <role>Jang Mi-ok</role>
    <type>Actor</type>
    <tmdbid>1551424</tmdbid>
  </actor>
  <actor>
    <name>Lee Se-young</name>
    <role>Wang Ja-hyun</role>
    <type>Actor</type>
    <tmdbid>2497859</tmdbid>
  </actor>
  <rating>9.1</rating>
  <year>2015</year>
  <mpaa>KR-15</mpaa>
  <imdb_id>tt5182866</imdb_id>
  <tmdbid>64010</tmdbid>
  <premiered>2015-11-06</premiered>
  <releasedate>2015-11-06</releasedate>
  <enddate>2016-01-16</enddate>
  <runtime>90</runtime>
  <country>韩国</country>
  <genre>Comedy</genre>
  <studio>tvN</studio>
  <tag>friendship</tag>
  <tag>school</tag>
  <tag>1980s</tag>
  <uniqueid type="Imdb">tt5182866</uniqueid>
  <uniqueid type="Tmdb">64010</uniqueid>
  <uniqueid type="Tvdb">301078</uniqueid>
  <tvdbid>301078</tvdbid>
  <id>301078</id>
  <episodeguide>
    <url cache="301078.xml">https://www.thetvdb.com/api/1D62F2F90030C444/series/301078/all/zh-CN.zip</url>
  </episodeguide>
  <season>-1</season>
  <episode>-1</episode>
  <displayorder>aired</displayorder>
  <status>Ended</status>
  <showtitle>请回答1988</showtitle>
  <votes>47</votes>
  <thumb aspect="poster">https://image.tmdb.org/t/p/original/mqhYVbe20pB0PQXVZVdtbMakOCF.jpg</thumb>
  <namedseason number="0">特别篇</namedseason>
  <namedseason number="1">第 1 季</namedseason>
  <thumb aspect="poster" season="1" type="season">https://image.tmdb.org/t/p/original/vn5NXBU97m2fwq1z4P0bOSjb3mE.jpg</thumb>
  <fanart>
    <thumb>https://image.tmdb.org/t/p/original/pIapTdND1pMSwLPjbvG1Iy6eUf1.jpg</thumb>
    <thumb>https://image.tmdb.org/t/p/original/sZH7lGs06skRKkrqp1LRi57VVMb.jpg</thumb>
    <thumb>https://image.tmdb.org/t/p/original/oDEPqQstDYUHUxzyHotV8yrnzGk.jpg</thumb>
    <thumb>https://image.tmdb.org/t/p/original/xa6TFV34VH1HPJmV5DmTaXvVREt.jpg</thumb>
  </fanart>
  <certification />
  <user_note />
</tvshow>`;
  const r2 = await parser.parse("tvshow.nfo", content4);
  console.log("Completed");
})();
