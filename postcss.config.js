import postcssGlobalData from '@csstools/postcss-global-data';
import postcssCustomMedia from 'postcss-custom-media';

// `@custom-media` (Media Queries Level 5) cannot reference custom properties, so the
// breakpoint tokens are also emitted as `@custom-media` rules and made visible to every
// CSS module through global data.
export default {
  plugins: [
    postcssGlobalData({ files: ['src/styles/generated/custom-media.css'] }),
    postcssCustomMedia(),
  ],
};
