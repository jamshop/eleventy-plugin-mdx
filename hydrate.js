const React = require("react");
const { hydrate } = require("react-dom");
module.exports = {
  hydrate: (Component, props, el) =>
    hydrate(React.createElement(Component, props, null), el),
  React: React,
};
