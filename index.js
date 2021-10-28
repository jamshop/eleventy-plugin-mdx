const React = require("react");
const { renderToString, renderToStaticMarkup } = require("react-dom/server");
const { build, transformSync } = require("esbuild");
const mdx = require("@mdx-js/mdx");
const requireFromString = require("require-from-string");
const ROOT_ID = "MDX_ROOT";

const esBuildMDXPlugin = ({ content }) => ({
  name: "esbuild-mdx",
  setup(build) {
    build.onLoad({ filter: /\.mdx?$/ }, async () => {
      return {
        contents:`import React from "react";
        import { mdx } from "@mdx-js/react";
        ${await mdx(content)}`,
        loader: "jsx",
      }
    })
  },
});

const doEsBuild = async (options) => {
  const { outputFiles } = await build(options);
  return new TextDecoder("utf-8").decode(outputFiles[0].contents);
}

const mdxBuildPlugin = (eleventyConfig, { includeCDNLinks=false } = {}) => {
  process.env.ELEVENTY_EXPERIMENTAL = "true";
  eleventyConfig.addTemplateFormats("mdx");
  eleventyConfig.addExtension("mdx", {
    getData: true,
    getInstanceFromInputPath: () => {},
    init: () => {},
    compile: (content, inputPath) => async (props) => {
      const esbuildOptions = {
        minify: process.NODE_ENV === "development" ? false : true,
        external: ['react', 'react-dom'],
        write: false,
        plugins: [...esBuildOptions.plugins, esBuildMDXPlugin({ content })],
        metafile: true,
        ...esBuildOptions,
        bundle: true,
        entryPoints: [inputPath],
      }

      const { serializeEleventyProps, ...defaultExport } = requireFromString(await doEsBuild({ platform: 'node', ...esbuildOptions }));
      
      let hydrateScript = "";
      if (serializeEleventyProps) {
        hydrateScript = transformSync(`const require = (e) => { if (e ==="react") return window.React };
        const hydrate = (Component, props, el) => ReactDOM.hydrate(React.createElement(Component, props, null), el);
        ${await doEsBuild({ platform: 'browser', globalName: 'Component', ...esbuildOptions })};
        const props = JSON.parse(${JSON.stringify(JSON.stringify(serializeEleventyProps(props)))});
        hydrate(Component.default,props,document.querySelector('#${ROOT_ID}'));
        `,
        {
          format: 'iife',
          minify: false
        }).code;
      }
      
      const rootComponent = React.createElement( "div", { id: ROOT_ID }, React.createElement(defaultExport.default, props, null));
      if(!serializeEleventyProps) return renderToStaticMarkup(rootComponent);
      return `
      ${includeCDNLinks ? `<script crossorigin src="https://unpkg.com/react@17/umd/react.production.min.js"></script>
      <script crossorigin src="https://unpkg.com/react-dom@17/umd/react-dom.production.min.js"></script>`:""}
      ${renderToString(rootComponent)}
      <script>${hydrateScript}</script>`
    }
  });

};

module.exports = mdxBuildPlugin;