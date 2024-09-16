const axios = require("axios");
const fs = require("node:fs");

const formatBody = (body) => {
  let ret = body.trim().replaceAll(/<img.*src="(.*?)".*?>/g, "![]($1)");
  ret = ret.replaceAll(
    /https:\/\/github.com\/EINDEX\/logseq-copilot\/(issues|pull)\/(\d+)/g,
    "[$1 #$2](https://github.com/EINDEX/logseq-copilot/$1/$2)"
  );
  const re = new RegExp(/^#{1,2} /gm);
  while (ret.match(re)) {
    ret = ret.replaceAll(/^(#+ )/gm, "#$1");
  }
  ret = ret.replaceAll(/@([\w\-_]+)/g, "[@$1](https://github.com/$1)");
  return ret;
};

const main = async () => {
  const resp = await axios({
    method: "GET",
    url: "https://api.github.com/repos/EINDEX/logseq-copilot/releases",
    headers: {
      Accept: "application/vnd.github+json",
      "X-Github-Api-Version": "2022-11-28",
    },
  });
  if (resp.status !== 200) {
    return;
  }
  const data = fs.readFileSync("changelog.template.md");
  let ret = data;
  for (const item of resp.data) {
    ret += `## [${item.name}](${item.url})

${formatBody(item.body)}\n`;
  }
  fs.writeFileSync("./docs/changelogs.md", ret);
};

main();
