const transformDeviceName = (name) => {
  try {
    let removedOnlySpaces = name.replace(/\s+/g, "_").toLowerCase();
    let enforcedNamingConvention = removedOnlySpaces.replace(/airqo/, "aq");
    return enforcedNamingConvention;
  } catch (err) {
    return name
  }
};

module.exports = transformDeviceName;
