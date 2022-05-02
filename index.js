const axios = require('axios')
const fs = require('fs')
const request = require('request');

getUrl = (page, search) => `https://www.christies.com/api/discoverywebsite/search/lot-infos?keyword=${search}&page=${page}&is_past_lots=False&sortby=relevance&language=en`



const searchString = process.argv[2]

var dir = `./images/${searchString}`;

if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
}


const run = async () => {
    const first = await axios.get(getUrl(1, searchString))
    const data = [...first.data.lots]
    const totalPages = first.data.total_pages

    for (let index = 2; index <= totalPages; index++) {
        const resp = await axios.get(getUrl(index, searchString))
        data.push(...resp.data.lots)
    }

    data.forEach(d => {
        download(d.image.image_src, `${d.title_secondary_txt.substr(0, 20)} - ${d.title_primary_txt.substr(0, 20)}.jpeg`.replace(/\//g, '-'), () => console.log('download done'))
    })
}



const download = function (uri, filename, callback) {
    request.head(uri, function (err, res, body) {
        console.log('content-type:', res.headers['content-type']);
        console.log('content-length:', res.headers['content-length']);
        request(uri).pipe(fs.createWriteStream(dir + '/' + filename)).on('close', callback);
    });
};

run()