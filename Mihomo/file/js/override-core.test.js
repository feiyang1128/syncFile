// JavaScript Override Core Test
// 模拟远程逻辑文件：只放通用处理逻辑，不放个人 overrideConfig。

function applyMihomoOverride(config, overrideConfig) {
  const userConfig = overrideConfig && typeof overrideConfig === 'object' ? overrideConfig : {};

  if (!hasOverrideConfig(userConfig)) {
    return config;
  }

  initializeConfig(config);

  const tools = createOverrideTools(config);

  applyGroups(tools, toArray(userConfig.groups));
  applyProxies(tools, toArray(userConfig.proxies));
  applyProxyInsertions(tools, toArray(userConfig.proxyInsertions));
  applyRuleProviders(tools, toArray(userConfig.ruleProviders));
  applyRules(tools, userConfig.rules);

  return config;
}

function hasOverrideConfig(userConfig) {
  const hasListConfig = [userConfig.groups, userConfig.proxies, userConfig.proxyInsertions, userConfig.ruleProviders].some((item) => Array.isArray(item) && item.length > 0);

  if (hasListConfig) {
    return true;
  }

  if (Array.isArray(userConfig.rules)) {
    return userConfig.rules.length > 0;
  }

  if (!userConfig.rules || typeof userConfig.rules !== 'object') {
    return false;
  }

  if (userConfig.rules.action === 'reset') {
    return true;
  }

  return userConfig.rules.action === 'add' && Array.isArray(userConfig.rules.items) && userConfig.rules.items.length > 0;
}

function initializeConfig(config) {
  if (!Array.isArray(config.proxies)) {
    config.proxies = [];
  }

  if (!Array.isArray(config['proxy-groups'])) {
    config['proxy-groups'] = [];
  }

  if (!config['rule-providers'] || typeof config['rule-providers'] !== 'object' || Array.isArray(config['rule-providers'])) {
    config['rule-providers'] = {};
  }

  if (!Array.isArray(config.rules)) {
    config.rules = [];
  }
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function applyGroups(tools, groups) {
  groups.forEach((item) => {
    if (item.action === 'reset') {
      tools.resetGroup(item.config, item.position);
    } else {
      tools.addGroup(item.config, item.position);
    }
  });
}

function applyProxies(tools, proxies) {
  proxies.forEach((item) => {
    const proxyName = item?.action === 'reset' ? tools.resetProxy(item.config, item.position) : tools.addProxy(item?.config, item?.position);

    if (!proxyName) {
      return;
    }

    const groupNames = Array.isArray(item.groupNames) ? item.groupNames : Array.isArray(item.groupName) ? item.groupName : [item.groupName];
    const groupPosition = Number.isInteger(item.groupPosition) ? item.groupPosition : -1;

    groupNames
      .map((groupName) => (typeof groupName === 'string' ? groupName.trim() : ''))
      .filter(Boolean)
      .forEach((groupName) => {
        tools.insertProxy(groupName, proxyName, groupPosition);
      });
  });
}

function applyProxyInsertions(tools, proxyInsertions) {
  proxyInsertions.forEach((item) => {
    const proxyNames = Array.isArray(item.proxyNames) ? item.proxyNames : Array.isArray(item.proxyName) ? item.proxyName : [item.proxyName];
    const startPosition = Number.isInteger(item.position) ? item.position : 1;

    proxyNames
      .map((proxyName) => (typeof proxyName === 'string' ? proxyName.trim() : ''))
      .filter(Boolean)
      .forEach((proxyName, index) => {
        const position = startPosition === -1 ? -1 : startPosition + index;
        tools.insertProxy(item.groupName, proxyName, position);
      });
  });
}

function applyRuleProviders(tools, ruleProviders) {
  ruleProviders.forEach((item) => {
    tools.addRuleProvider(item);
  });
}

function applyRules(tools, rulesConfig) {
  const isLegacyArray = Array.isArray(rulesConfig);
  const action = isLegacyArray ? 'add' : rulesConfig?.action;
  const items = isLegacyArray ? rulesConfig : toArray(rulesConfig?.items);

  if (action !== 'add' && action !== 'reset') {
    return;
  }

  if (action === 'reset') {
    tools.resetRules();
  }

  const validItems = items
    .filter((item) => item && typeof item.rule === 'string')
    .map((item) => ({
      ...item,
      rule: item.rule.trim(),
    }))
    .filter((item) => item.rule);

  validItems.forEach((item, index) => {
    const position = Number.isInteger(item.position) ? item.position : index + 1;

    if (action === 'add') {
      tools.insertRuleBeforeMatch(item.rule, position);
    } else {
      tools.insertRule(item.rule, position);
    }
  });
}

function createOverrideTools(config) {
  const proxies = config.proxies;
  const groups = config['proxy-groups'];

  const getProxy = (name) => proxies.find((item) => item.name === name);
  const getGroup = (name) => groups.find((item) => item.name === name);

  const normalizeProxyConfig = (proxyConfig) => {
    if (!proxyConfig || typeof proxyConfig !== 'object' || Array.isArray(proxyConfig)) {
      return null;
    }

    const name = typeof proxyConfig.name === 'string' ? proxyConfig.name.trim() : '';

    if (!name) {
      return null;
    }

    return {
      ...proxyConfig,
      name,
    };
  };

  const addProxy = (proxyConfig, position = -1) => {
    const normalizedConfig = normalizeProxyConfig(proxyConfig);

    if (!normalizedConfig) {
      return null;
    }

    if (getProxy(normalizedConfig.name)) {
      return normalizedConfig.name;
    }

    insertAt(proxies, normalizedConfig, position);
    return normalizedConfig.name;
  };

  const resetProxy = (proxyConfig, position) => {
    const normalizedConfig = normalizeProxyConfig(proxyConfig);

    if (!normalizedConfig) {
      return null;
    }

    const oldIndex = proxies.findIndex((item) => item.name === normalizedConfig.name);

    if (oldIndex !== -1) {
      proxies.splice(oldIndex, 1);
    }

    const targetPosition = position === undefined ? (oldIndex === -1 ? -1 : oldIndex + 1) : position;
    insertAt(proxies, normalizedConfig, targetPosition);

    return normalizedConfig.name;
  };

  const addGroup = (groupConfig, position = -1) => {
    if (!groupConfig || typeof groupConfig.name !== 'string' || !groupConfig.name.trim() || getGroup(groupConfig.name)) {
      return;
    }

    insertAt(groups, groupConfig, position);
  };

  const resetGroup = (groupConfig, position) => {
    if (!groupConfig || typeof groupConfig.name !== 'string' || !groupConfig.name.trim()) {
      return;
    }

    const oldIndex = groups.findIndex((item) => item.name === groupConfig.name);

    if (oldIndex !== -1) {
      groups.splice(oldIndex, 1);
    }

    const targetPosition = position === undefined ? (oldIndex === -1 ? -1 : oldIndex + 1) : position;
    insertAt(groups, groupConfig, targetPosition);
  };

  const insertProxy = (groupName, proxyName, position = 1) => {
    const group = getGroup(groupName);

    if (!group || typeof proxyName !== 'string' || !proxyName.trim()) {
      return;
    }

    if (!Array.isArray(group.proxies)) {
      group.proxies = [];
    }

    const oldIndex = group.proxies.indexOf(proxyName);

    if (oldIndex !== -1) {
      group.proxies.splice(oldIndex, 1);
    }

    insertAt(group.proxies, proxyName, position);
  };

  const insertRule = (rule, position = 1) => {
    if (!config.rules.includes(rule)) {
      insertAt(config.rules, rule, position);
    }
  };

  const insertRuleBeforeMatch = (rule, position = 1) => {
    if (config.rules.includes(rule)) {
      return;
    }

    const matchIndex = config.rules.findIndex((item) => typeof item === 'string' && /^MATCH(?:,|$)/i.test(item.trim()));
    const lastInsertIndex = matchIndex === -1 ? config.rules.length : matchIndex;

    if (position === -1) {
      config.rules.splice(lastInsertIndex, 0, rule);
      return;
    }

    config.rules.splice(Math.min(Math.max(0, position - 1), lastInsertIndex), 0, rule);
  };

  const resetRules = () => {
    config.rules.splice(0, config.rules.length);
  };

  const addRuleProvider = (providerConfig) => {
    if (!providerConfig || typeof providerConfig !== 'object' || Array.isArray(providerConfig)) {
      return;
    }

    let { name, ...provider } = providerConfig;

    if (typeof name !== 'string' || !name.trim()) {
      return;
    }

    name = name.trim();
    provider.type = provider.type || 'http';
    provider.behavior = provider.behavior || 'classical';

    if (provider.type === 'http') {
      provider.path = provider.path || `./rule/${name}.yaml`;
      provider.interval = Number.isFinite(provider.interval) ? provider.interval : 3600;
    }

    if (config['rule-providers'][name] || !['http', 'file', 'inline'].includes(provider.type)) {
      return;
    }

    if ((provider.type === 'http' && !provider.url) || (provider.type === 'file' && !provider.path) || (provider.type === 'inline' && !Array.isArray(provider.payload))) {
      return;
    }

    config['rule-providers'][name] = provider;
  };

  return {
    getProxy,
    getGroup,
    addProxy,
    resetProxy,
    addGroup,
    resetGroup,
    insertProxy,
    insertRule,
    insertRuleBeforeMatch,
    resetRules,
    addRuleProvider,
  };
}

function insertAt(list, item, position = -1) {
  if (position === -1) {
    list.push(item);
    return;
  }

  const targetIndex = Math.max(0, position - 1);

  if (targetIndex >= list.length) {
    list.push(item);
    return;
  }

  list.splice(targetIndex, 0, item);
}

const MihomoOverride = {
  apply: applyMihomoOverride,
};

if (typeof globalThis !== 'undefined') {
  globalThis.MihomoOverride = MihomoOverride;
  globalThis.applyMihomoOverride = applyMihomoOverride;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = MihomoOverride;
}
