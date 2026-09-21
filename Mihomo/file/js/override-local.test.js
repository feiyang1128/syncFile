// JavaScript Override Local Config Test
// 模拟本地配置文件：这里只放 overrideConfig，再引用远程核心逻辑。

const overrideCoreUrl = 'https://gh-proxy.org/https://raw.githubusercontent.com/feiyang1128/syncFile/refs/heads/main/Mihomo/file/js/override-core.test.js';

const overrideConfig = {
  groups: [
    {
      config: {
        name: '自建组',
        type: 'select',
        proxies: ['DIRECT'],
      },
      action: 'add',
      position: -1,
    },
  ],
  proxies: [
    {
      config: {
        name: '自建节点',
        type: 'ss',
        server: 'example.com',
        port: 443,
        cipher: '2022-blake3-aes-128-gcm',
        password: 'password',
      },
      action: 'add',
      position: -1,
      groupNames: ['自建组'],
      groupPosition: 1,
    },
  ],
};

function main(config) {
  return getOverrideApply()(config, overrideConfig);
}

function getOverrideApply() {
  const apply =
    typeof applyMihomoOverride === 'function'
      ? applyMihomoOverride
      : typeof MihomoOverride !== 'undefined'
        ? MihomoOverride.apply
        : null;

  if (typeof apply === 'function') {
    return apply;
  }

  if (typeof require === 'function') {
    return require('./override-core.test.js').apply;
  }

  throw new Error(`未加载远程 override core，请先加载：${overrideCoreUrl}`);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { main, overrideConfig, overrideCoreUrl };
}
