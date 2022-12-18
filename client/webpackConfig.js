const path = require("path")

module.exports = {
    entry : "./client/src/ClinetSocket.js",
    output : {
        filename : 'bundele.js',
        // path : path.resolve(__dirname, '../../dist')
    },
    mode : "production",
    module : {
        rules : [
            {
                test : /\.js/,
                exclude : /node_modules/,
                use : {
                    loader : 'babel-loader',
                    options : {
                        presets : ['@babel/preset-env' ]
                    }
                }
            }
        ]
    }
}