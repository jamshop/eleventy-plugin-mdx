const React = require("react");
const { renderToString, renderToStaticMarkup } = require("react-dom/server");
const { build, transformSync } = require("esbuild");
const requireFromString = require('require-from-string');
const mdx = require("./mdx");
const { v4: uuid } = require("uuid");
const fs = require("fs");
const path = require("path");

// Kinda hate that I am doubling up on gray-matter & handlebars, would love to be able to hook into the existing template engine
const matter = require('gray-matter');
const handlebars = require("handlebars");


const ESBUILD_OPTIONS = {
  minify: process.NODE_ENV === "development" ? false : true,
  external: ['react', 'react-dom'],
  write: false,
  metafile: true,
  bundle: true,
}

const esBuildMDXPlugin = ({ inputPath }) => ({
  name: "esbuild-mdx",
  setup(build) {
    build.onLoad({ filter: /\.mdx?$/ }, async ({path: filePath}) => {
      
      let content
      try {
        content = matter(await fs.promises.readFile(filePath, "utf8")).content;
      } catch (err) {
        throw new Error(`Error parsing gray matter in '${filePath}'. Error: ${err.message}`);
      }
      
      if(filePath !== inputPath) {
        try {
          return {
            contents: (await mdx.compile(content, { jsxRuntime: 'classic' })).value,
            loader: "jsx",
          }
        } catch (err) {
          throw new Error(`Error parsing mdx content in '${inputPath}'. Error: ${err.message}`);
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

const getData = async (inputPath) => {
  
  const { content, data } = matter(await fs.promises.readFile(inputPath, "utf8"));

  let clientBundle
  try {
    clientBundle = await doEsBuild({
      ...ESBUILD_OPTIONS,
      platform: 'browser',
      globalName: 'Component',
      plugins: [esBuildMDXPlugin({ inputPath })],
      entryPoints: [inputPath],
    });
  } catch (err) {
    throw new Error([err], `Error creating esbuild bundle from '${inputPath}'. Error: ${err.message}`)
  }

  let code
  try {
    code = await doEsBuild({
      ...ESBUILD_OPTIONS,
      platform: 'node',
      plugins: [esBuildMDXPlugin({ inputPath })],
      entryPoints: [inputPath],
    });
  } catch (err) {
    throw new Error(`Error creating esbuild of code from '${inputPath}'. Error: ${err.message}`)
  }
   
  const { serializeEleventyProps = false, default: component, htmlTemplate, data: exportData } = requireFromString(code);

  return {
    serializeEleventyProps,
    ___mdx_content: content,
    ___mdx_component: component,
    ___mdx_clientBundle: clientBundle,
      htmlTemplate,
      ...data, 
      ...exportData 
  };

}

let globalStore = {};

class EleventyMDX {

  constructor ({includeCDNLinks, components}) {
    globalStore.includeCDNLinks = includeCDNLinks;
    globalStore.components = components;
  }

  async getInstanceFromInputPath(inputPath) {
    return { data: await getData(inputPath) }
  }

  compile(permalink, inputPath) {
    return async function (props) {

      let components = {}

      for(const key in globalStore.components) {
        components[key] = globalStore.components[key].bind(props);
      }

      props = { ...props, components };

      if (permalink) {
        if (typeof permalink === 'function')  return permalink(props);
        // ToDo.... would be great to be able to hook into the existing template engine here
        return handlebars.compile(permalink)(props);
      }


      const ROOT_ID = `MDX_ROOT_${process.env.NODE_ENV !== "test" ? uuid() : "test"}`;

      const { ___mdx_component, ___mdx_clientBundle, htmlTemplate, serializeEleventyProps, mdxFragment } = await getData(inputPath);
      
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
            minify: process.NODE_ENV === "development" ? false : true
          }).code;
      }

      // Serialize props for static rendering
      if (serializeEleventyProps) {
        props = { ...serializeEleventyProps(props), ...props };
      }

      const rootComponent = mdxFragment ? React.createElement(React.Fragment, {}, React.createElement(___mdx_component, props)) : React.createElement("div", { id: ROOT_ID }, React.createElement(___mdx_component, props));

      if (!serializeEleventyProps) {
        const content = renderToStaticMarkup(rootComponent);

        if (htmlTemplate) {
          if (typeof htmlTemplate === 'function') return htmlTemplate(content, props);
      
          const templatePath = path.join(path.dirname(inputPath), htmlTemplate);
          const templateContent = await fs.promises.readFile(templatePath, "utf8");
          // ToDo.... would be great to be able to hook into the existing template engine here
          return handlebars.compile(templateContent)({...props, content});
        }

        return content;
      };


      return `
        ${globalStore.includeCDNLinks ? `<script crossorigin src="https://unpkg.com/react@17/umd/react.production.min.js"></script>
        <script crossorigin src="https://unpkg.com/react-dom@17/umd/react-dom.production.min.js"></script>`: ""}
        ${renderToString(rootComponent)}
        <script>${hydrateScript}</script>`
    }
  }
}


module.exports = EleventyMDX;