const React = require("react");
const runtime = require('react/jsx-runtime.js');
const { renderToString, renderToStaticMarkup } = require("react-dom/server");
const { build, transformSync } = require("esbuild");
const mdx = require("./mdx");
const fs = require("fs");

// Kinda hate that I am doubling up on gray-matter & handlebars, would love to be able to hook into the existing template engine
const matter = require('gray-matter');
const handlebars = require("handlebars");

const ROOT_ID = "MDX_ROOT";

const esBuildMDXPlugin = ({ content }) => ({
  name: "esbuild-mdx",
  setup(build) {
    build.onLoad({ filter: /\.mdx?$/ }, async () => {
      return {
        contents: `import React from "react";
        import { mdx } from "@mdx-js/react";
        ${await mdx.compile(content)}`,
        loader: "jsx",
      }
    })
  },
});

const doEsBuild = async (options) => {
  const { outputFiles } = await build(options);
  return new TextDecoder("utf-8").decode(outputFiles[0].contents);
}

const mdxBuildPlugin = (eleventyConfig, { includeCDNLinks = false } = {}) => {
  process.env.ELEVENTY_EXPERIMENTAL = "true";
  eleventyConfig.addTemplateFormats("mdx");
  eleventyConfig.addExtension("mdx", {
    read: false,
    data: true,
    getData: true,
    getInstanceFromInputPath: async (inputPath) => {
      const {content, data } = matter(await fs.promises.readFile(inputPath, "utf8"));
      const { serializeEleventyProps = false, default: component, data: exportData } = await mdx.evaluate(content, { ...runtime });
      return {
        data: {
          serializeEleventyProps,
          ___mdx_content: content,
          ___mdx_component: component,
          ...data,
          ...exportData,
        },
      };
    },
    init: () => { },
    compile: (permalink, inputPath) => async ({ serializeEleventyProps, ___mdx_content, ___mdx_component, ...props }) => {

      if(permalink) {
        return (typeof permalink === 'function') ? permalink(props) : handlebars.compile(permalink)(props);
      }

      const esbuildOptions = {
        minify: process.NODE_ENV === "development" ? false : true,
        external: ['react', 'react-dom'],
        write: false,
        plugins: [esBuildMDXPlugin({ content: ___mdx_content })],
        metafile: true,
        bundle: true,
        entryPoints: [inputPath],
      }

      let hydrateScript = "";
      if (serializeEleventyProps) {
        hydrateScript = transformSync(`
        const require = (e) => { if (e ==="react") return window.React; }; 
        ${await doEsBuild({ platform: 'browser', globalName: 'Component', ...esbuildOptions })};
        const props = JSON.parse(${JSON.stringify(JSON.stringify(serializeEleventyProps(props)))});
        ReactDOM.hydrate(React.createElement(Component.default, props, null), document.querySelector('#${ROOT_ID}'));
        `,
          {
            format: 'iife',
            minify: true
          }).code;
      }

      const rootComponent = React.createElement("div", { id: ROOT_ID }, React.createElement(___mdx_component, props, null));
      if (!serializeEleventyProps) return renderToStaticMarkup(rootComponent);
      return `
      ${includeCDNLinks ? `<script crossorigin src="https://unpkg.com/react@17/umd/react.production.min.js"></script>
      <script crossorigin src="https://unpkg.com/react-dom@17/umd/react-dom.production.min.js"></script>`: ""}
      ${renderToString(rootComponent)}
      <script>${hydrateScript}</script>`
    }
  });

};

module.exports = mdxBuildPlugin;