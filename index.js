const axios = require('axios')
const fs = require('fs')
const stream = require('stream');
const https = require('https');
const { promisify } = require('util');

getUrl = (page, search, past) => `https://www.christies.com/api/discoverywebsite/search/lot-infos?keyword=${search}&page=${page}&is_past_lots=${past ? 'True' : 'False'}&sortby=relevance&language=en`

const searchString = process.argv[2]
const withPast = process.argv.find(a => a === '--withPast') !== undefined

const axiosClient = axios.create({
    httpsAgent: new https.Agent({ keepAlive: true }),
});

var dir = `./images/${searchString}`;

if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
}

const failedDataRequests = []
const failedDownloads = []

const getPics = async (past) => {
    const first = await axios.get(getUrl(1, searchString, past))
    const data = [...first.data.lots]
    const totalPages = first.data.total_pages

    const calls = [...Array(totalPages + 1).keys()].filter(k => k !== 0 && k !== 1).map(index => {
        return new Promise((resolve, reject) => {
            setTimeout(async () => {
                const url = getUrl(index, searchString, past)
                try {
                    const resp = await axiosClient.get(url)
                    console.log('get data page', index, url);

                    resolve(resp)
                } catch (err) {
                    console.log('failed to get data', err.code, url);
                    failedDataRequests.push(url)
                    resolve({ data: { lots: [] } })
                }
            }, 100)
        })
    })

    const resps = await Promise.all(calls)

    for (let index = 0; index < resps.length; index++) {
        const r = resps[index]
        data.push(...r.data.lots)
    }

    for (let index = 0; index < data.length; index++) {
        const d = data[index]
        const title = `${d.title_secondary_txt.substr(0, 20)} - ${d.title_primary_txt.substr(0, 20)}.jpeg`.replace(/\//g, '-')
        await download(d.image.image_src, title, () => console.log('download done, file: ', title))
    }
}

const download = async function (uri, filename, callback) {
    return new Promise(async resolve => {
        setTimeout(async () => {
            try {
                await axios({
                    method: 'HEAD',
                    url: uri,
                });

                const finishedDownload = promisify(stream.finished);
                const writer = fs.createWriteStream(dir + '/' + filename);

                const response = await axios({
                    method: 'GET',
                    url: uri,
                    responseType: 'stream',
                });

                response.data.pipe(writer);
                await finishedDownload(writer);

                callback()
            } catch (error) {
                console.log('\ndownload error', error.request.path);
                failedDownloads.push(uri)
            } finally {
                resolve()
            }
        }, 10)
    })
};


const run = async () => {
    await getPics(false)
    if (withPast) {
        await getPics(withPast)
    }

    if (failedDownloads.length > 0) {
        fs.writeFileSync('./failed_downloads.json', JSON.stringify(failedDownloads, null, 2), { encoding: 'utf-8' })
    }

    if (failedDataRequests.length > 0) {
        fs.writeFileSync('./failed_data_requests.json', JSON.stringify(failedDataRequests, null, 2), { encoding: 'utf-8' })
    }
}

run()