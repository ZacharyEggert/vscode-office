let configs = null;

export function getConfigs() {
  if (configs) return configs;
  const configElement = document.getElementById("office-configs");
  const configJson = configElement.getAttribute("data-config");
  if (configJson == "{{configs}}") return null;
  configs = JSON.parse(configJson);
  return configs;
}
