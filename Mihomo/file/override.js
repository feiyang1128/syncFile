// JavaScript Override
// 配置入口：这里只维护 overrideConfig，通用处理逻辑从远程 override.core.js 读取。

const overrideCoreUrl = 'https://gh-proxy.org/https://raw.githubusercontent.com/feiyang1128/syncFile/refs/heads/main/Mihomo/file/override.core.js';
globalThis.loadOverrideConfig = () => overrideConfig;
importScripts(overrideCoreUrl);

// =====================
// 用户配置
// =====================

// 所有配置项均可省略。当前示例全部被注释，脚本默认不会修改订阅。
// 使用时取消需要部分的注释即可。
const overrideConfig = {
  // =====================
  // 策略组配置
  // =====================
  // groups: [
  //   // 完整的 Mihomo 策略组配置
  //   {
  //     config: {
  //       name: '专线',
  //       type: 'url-test',
  //       'include-all': true,
  //       'exclude-type': 'direct',
  //       filter: '专线',
  //       url: 'https://www.gstatic.com/generate_204',
  //       interval: 300,
  //       lazy: true,
  //     },
  //     // add：不存在时添加，已存在时跳过
  //     // reset：删除同名分组后重建，不存在时直接创建
  //     action: 'add',
  //     // 可省略
  //     // add 默认最后一位
  //     // reset 默认保持原位置，不存在时放到最后
  //     // 1 第一位，2 第二位，-1 最后一位
  //     position: -1,
  //   },
  // ],
  // =====================
  // 代理或策略组插入配置
  // =====================
  // proxyInsertions: [
  //   {
  //     // 目标分组名称；不存在时跳过
  //     groupName: '良心云',
  //     // 要插入的代理或策略组名称
  //     // 空字符串、纯空格和非字符串值会被忽略
  //     proxyNames: ['专线'],
  //     // 可省略，默认从第一位开始连续插入
  //     // 1 第一位，2 第二位，-1 最后一位
  //     position: 1,
  //   },
  // ],
  // =====================
  // 外部规则资源配置
  // =====================
  // ruleProviders: [
  //   {
  //     // 规则资源名称，必填；同名资源已存在时跳过
  //     name: 'aiRule',
  //     // 可省略，默认 http
  //     // http：从远程地址下载
  //     // file：读取本地文件
  //     // inline：直接使用 payload 中的规则
  //     type: 'http',
  //     // type 为 http 时必填
  //     url: 'https://gh-proxy.org/https://raw.githubusercontent.com/feiyang1128/syncFile/refs/heads/main/Mihomo/file/AI.txt',
  //     // type 为 http 时可省略，默认 ./rule/<name>.yaml
  //     // type 为 file 时必填
  //     path: './rule/aiRule.yaml',
  //     // 可省略，默认 classical
  //     // classical：完整路由规则，例如 DOMAIN-SUFFIX、IP-CIDR、GEOIP
  //     // domain：仅包含域名或域名通配符
  //     // ipcidr：仅包含 IPv4/IPv6 CIDR
  //     behavior: 'classical',
  //     // 可省略，默认 yaml；还支持 text、mrs
  //     format: 'yaml',
  //     // type 为 http 时可省略，默认 3600 秒
  //     interval: 3600,
  //     // type 为 inline 时必填，此时不需要 url 和 path
  //     // payload: ['DOMAIN-SUFFIX,openai.com'],
  //   },
  // ],
  // =====================
  // 路由规则配置
  // =====================
  // rules: {
  //   // add：保留原规则，新增规则放到第一个 MATCH 之前
  //   // reset：清空全部原规则（包括所有 MATCH），再写入 items
  //   // add 和 reset 互斥，只能选择一个
  //   action: 'add',
  //   // 需要新增或重置写入的规则
  //   items: [
  //     {
  //       rule: 'RULE-SET,aiRule,专线',
  //       // 可省略，默认按照 items 的顺序从第一条开始排列
  //       // 1 第一条，2 第二条
  //       // add 模式下 -1 表示第一个 MATCH 之前的最后一条
  //       // reset 模式下 -1 表示整个规则列表的最后一条
  //       position: 1,
  //     },
  //   ],
  // },
};
