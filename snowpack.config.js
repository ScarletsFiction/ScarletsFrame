/** @type {import("snowpack").SnowpackUserConfig } */
module.exports = {
  mount: {
    public: '/',
    src: '/dist',
  },
  plugins: [
    // '@snowpack/plugin-babel',
    '@snowpack/plugin-dotenv'
  ],
  buildOptions: {
  	htmlFragments: true
  }
};