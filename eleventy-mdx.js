const React = require("react");
const { renderToString, renderToStaticMarkup } = require("react-dom/server");
const { build, transformSync } = require("esbuild");
const requireFromString = require('require-from-string');
const mdx = require("./mdx");
const fs = require("fs");

// Kinda hate that I am doubling up on gray-matter & handlebars, would love to be able to hook into the existing template engine
const matter = require('gray-matter');
const handlebars = require("handlebars");

const ROOT_ID = "MDX_ROOT";

const ESBUILD_OPTIONS = {
  minify: process.NODE_ENV === "development" ? false : true,
  external: ['react', 'react-dom'],
  write: false,
  metafile: true,
  bundle: true,
}

const esBuildMDXPlugin = ({  inputPath }) => ({
  name: "esbuild-mdx",
  setup(build) {
    build.onLoad({ filter: /\.mdx?$/ }, async ({path: filePath}) => {
      
      
      const { content } = matter(await fs.promises.readFile(filePath, "utf8"));
      
      if(filePath !== inputPath) {
        const c = await mdx.compile(content);
        console.log(c.value);
        return {
          contents: c.value,
          loader: "jsx",
        }
      }

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


class EleventyMDX {

  constructor ({includeCDNLinks, components}) {
    this.includeCDNLinks = includeCDNLinks;
    this.components = components;
  }

  async getInstanceFromInputPath(inputPath) {
     
    const { content, data } = matter(await fs.promises.readFile(inputPath, "utf8"));

    const clientBundle = await doEsBuild({
      ...ESBUILD_OPTIONS,
      platform: 'browser',
      globalName: 'Component',
      plugins: [esBuildMDXPlugin({ inputPath })],
      entryPoints: [inputPath],
    });

    const code = await doEsBuild({
      ...ESBUILD_OPTIONS,
      platform: 'node',
      plugins: [esBuildMDXPlugin({ inputPath })],
      entryPoints: [inputPath],
    });
        
    const { serializeEleventyProps = false, default: component, data: exportData } = requireFromString(code);
    
    return {
      data: {
        serializeEleventyProps,
        ___mdx_content: content,
        ___mdx_component: component,
        ___mdx_clientBundle: clientBundle,        
        props: { components: this.components, ...data, ...exportData }
      },
    };
  }

  compile(permalink) {

    return async ({ serializeEleventyProps, ___mdx_content, ___mdx_component, ___mdx_clientBundle, props }) => {

      if (permalink) {
        return (typeof permalink === 'function') ? permalink(props) : handlebars.compile(permalink)(props);
      }

      let hydrateScript = "";
      if (serializeEleventyProps) {
        hydrateScript = transformSync(`
      const require = (e) => { if (e === "react") return window.React; };
      ${___mdx_clientBundle}
      const props = JSON.parse(${JSON.stringify(JSON.stringify(serializeEleventyProps(props)))});
      ReactDOM.hydrate(React.createElement(Component.default, props, null), document.querySelector('#${ROOT_ID}'));
      `,
          {
            format: 'iife',
            minify: true
          }).code;
      }

      const rootComponent = React.createElement("div", { id: ROOT_ID }, React.createElement(___mdx_component, props));


      console.log(___mdx_component)

      if (!serializeEleventyProps) return renderToStaticMarkup(rootComponent);

      return `
        ${this.includeCDNLinks ? `<script crossorigin src="https://unpkg.com/react@17/umd/react.production.min.js"></script>
        <script crossorigin src="https://unpkg.com/react-dom@17/umd/react-dom.production.min.js"></script>`: ""}
        ${renderToString(rootComponent)}
        <script>${hydrateScript}</script>`
    }
  }
}


module.exports = EleventyMDX;