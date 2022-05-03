const axios = require('axios')
const fs = require('fs')
const request = require('request');

getUrl = (page, search, past) => `https://www.christies.com/api/discoverywebsite/search/lot-infos?keyword=${search}&page=${page}&is_past_lots=${past ? 'True' : 'False'}&sortby=relevance&language=en`



const searchString = process.argv[2]
const withPast = process.argv.find(a => a === '--withPast') !== undefined

var dir = `./images/${searchString}`;

if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
}

const getPics = async (past) => {
    const first = await axios.get(getUrl(1, searchString, past))
    const data = [...first.data.lots]
    const totalPages = first.data.total_pages

    for (let index = 2; index <= totalPages; index++) {
        console.log('getting data from page: ', index);
        const resp = await axios.get(getUrl(index, searchString, past))
        data.push(...resp.data.lots)
    }

    data.forEach(d => {
        const title = `${d.title_secondary_txt.substr(0, 20)} - ${d.title_primary_txt.substr(0, 20)}.jpeg`.replace(/\//g, '-')
        download(d.image.image_src, title, () => console.log('download done, file: ', title))
    })
}


const run = async () => {
    getPics(false)

    if (withPast) {
        getPics(withPast)
    }
}



const download = function (uri, filename, callback) {
    request.head(uri, function (err, res, body) {
        request(uri).pipe(fs.createWriteStream(dir + '/' + filename)).on('close', callback);
    });
};

run()

if (withPast) {
    console.log('\n\n\nstarting to fetch past lots\n');
}