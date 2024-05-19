// import { removeStopwords, eng } from 'stopword'
import { BlockSearchType, LogseqBlockType } from '../../types/logseqBlock';
import LogseqClient from './client';
import { cleanBlock, isBlockIgnore, renderBlock } from './tool';

export default class LogseqService {
  private logseqClient: LogseqClient = new LogseqClient();

  public async getGraph() {
    return await this.logseqClient.getGraph();
  }

  public async search(query: string) {
    const graph = await this.getGraph();
    if(graph.status == 500){
      throw new Error("Error getting graph. Please check if Logseq is running.");
    }
    try {
      // // commenting this because sometimes it removes important words like Eg:
      // // stack me first = stack first
      // // regex is used to split the query using stop words
      // const splitByStopWords = new RegExp('\\b(?:' + eng.join('|') + ')\\b', 'g'); 
      // const words = query.split(splitByStopWords).map(w=>w.trim()).filter(word => word !== '');

      // const queryWithoutStopwords = removeStopwords(words, eng).join(' ');
      // console.log({words, queryWithoutStopwords});

      const result = await this.logseqClient.search(query);
      result.blocks = await Promise.all(
        result.blocks.map(async (block) => {
          return await this.getBlock(block['block/uuid'], graph.name, query);
        }),
      );
      result.pages = await Promise.all(
        result.pages.map(async (page: string) => {
          return await this.logseqClient.getPage({
            name: page,
          });
        }),
      );
  
      result.graph = graph.name;
      result.count = result.blocks.length + result.pages.length;
  
      return {
        msg: 'success',
        status: 200,
        response: result,
      };
    } catch (error) {
      return {
        msg: 'no results',
        status: 204,
        response: error,
      };
    }
  }

  public async getBlock(
    blockUuid: string,
    graph: string,
    query?: string,
    includeChildren: boolean = false,
  ) {
    const block = await this.logseqClient.getBlockViaUuid(blockUuid, {
      includeChildren,
    });
    if(block.refs?.length > 0){
      // console.log({content: block.content, blockRefs: block.refs});
      const blockRefRegex = /\(?\(\((.*?)\)\)\)?/gm;
      const matches = block.content.matchAll(blockRefRegex);
      for (const match of matches) {
        if(match[1]){
          const blockRefUuid = match[1];
          const blockRefContent = await this.logseqClient.getBlockViaUuid(blockRefUuid, {
            includeChildren,
          });
          const cleanContent = cleanBlock(blockRefContent);
          const blockContent = block.content;
          const replacedContent = blockContent.replace(blockRefUuid, cleanContent);
          block.content = replacedContent;
          console.log("ReplacedContent", block.content)
        }
      }

    }
    block.page = await this.logseqClient.getPage(block.page);
    return renderBlock(block, graph, query);
  }

  public async urlSearch(url: URL, tabTitle: string, opt: { fuzzy: boolean } = { fuzzy: false }) {
    const graph = await this.getGraph();
    const blockUuidSet = new Set();
    const blocks: LogseqBlockType[] = [];

    const blockAdd = (block: LogseqBlockType) => {
      if (blockUuidSet.has(block.uuid)) {
        return;
      }
      blockUuidSet.add(block.uuid);
      blocks.push(block);
    };

    const find = async (url: string, blockSearchType?: BlockSearchType) => {
      const results = await this.logseqClient.find(url);
      results?.forEach((b: LogseqBlockType)=>{
        b.blockSearchType = blockSearchType;
        b.searchQuery = url;
        if(isBlockIgnore(b)) {
          // do nothing
        }else{
          blockAdd(b);
        }
      });
    };

    const caseInsensitiveSearch = async (queryString: string, blockSearchType?: BlockSearchType) => {
      const result = await this.logseqClient.search(queryString);
      // const result = await this.search(queryString);
      const searchBlocks = await Promise.all(
        // result.response.blocks.map(async (block) => {
        result.blocks.map(async (block) => {
          return await this.getBlock(block['block/uuid'], graph.name);
        }),
      );

      searchBlocks.forEach(b => {

        b.blockSearchType = blockSearchType;
        b.searchQuery = queryString;

        if (isBlockIgnore(b)) {
          // do nothing
        } else {
          blockAdd(b);
        }
      })

    };

    this.correctUrlPerWebsite(url);

    if (url.hash) {
      await find(url.host + url.pathname + url.search + url.hash);
    }
    if (url.search) {
      let searchString = url.host + url.pathname + url.search
      if(url.host.includes("youtube.com") && url.pathname == '/watch') {
        searchString = url.searchParams.get('v') || searchString;
        // for youtube video url's search only for video id
        // this is useful for video url's from playlist - example below:
        // https://www.youtube.com/watch?v=VQut4xOcPvE&list=PLFwqDjxup1l2dN53NoPhBvLSJWtN6pZ3o&index=35
        // https://www.youtube.com/watch?app=desktop&v=ov7seVpQ-ig&embeds_referring_euri=https%3A%2F%2F
      }
      await find(searchString);
    }

    if (url.pathname && this.isUrlValidForFuzzy(url)) {
      await find(url.host + url.pathname);
    }

    if(typeof tabTitle =="string" && tabTitle !== ""){
      // typically all brower window titles have company name at the end. Below code removes it from the title
      const correctedTitle = this.correctTitleToSearch(url, tabTitle);

      await caseInsensitiveSearch(correctedTitle, BlockSearchType.WEBPAGE_TITLE);
    }

    const count = blocks.length;

    if (url.host && opt.fuzzy && this.isUrlValidForFuzzy(url)) {
      await find(url.host, BlockSearchType.FUZZY_URL);
    }

    return {
      status: 200,
      msg: 'success',
      response: {
        blocks: blocks.map((block) => {
          return renderBlock(block, graph.name, url.href);
        }),
        graph: graph.name,
      },
      count: count,
    };
  }

  private isUrlValidForFuzzy(url: URL) {
    if(url.host.includes("youtube.com")) {
      // ignore youtube video's for fuzzy search
      return false;
    }

    if(url.host.includes("google.com") && url.pathname == '/search') {
      // ignore google searches for fuzzy search
      return false;
    }

    if(url.host == "discuss.logseq.com") {
      // ignore discuss.logseq.com for fuzzy search
      return false;
    }

    if(url.host .includes("wikipedia.org")) {
      // ignore wikipedia.org for fuzzy search
      return false;
    }

    if(url.host.includes("marketplace.visualstudio.com") && url.pathname == '/items') {
      // ignore marketplace.visualstudio.com for fuzzy search
      return false;
    }

    return true;

  }

  public correctTitleToSearch(url: URL, tabTitle: string) {

    let titleToSearch = tabTitle;

    const splitTitle = tabTitle.split(" | ");
    if(splitTitle.length > 1) splitTitle.pop();
    const titleWithoutCompanyName = splitTitle.join("").trim();

    titleToSearch = titleWithoutCompanyName;

    if(
      (url.host.includes("google.com") && url.pathname == '/search')
      || (url.host.includes("bing.com") && url.pathname == '/search')
      // || (url.host.includes("atlassian.net") || url.host.includes("atlassian.com"))
      || (url.host.includes("youtube.com"))) {
      // ignore google searches for fuzzy search
      const splitTitle = tabTitle.split(" - ");
      splitTitle.pop();
      const googleSearchTitle = splitTitle.join("").trim();
  
      titleToSearch = googleSearchTitle;
    }

    return titleToSearch;
  }

  private correctUrlPerWebsite(url: URL) {
    if(url.host.includes("youtube.com") && url.pathname == '/watch') {
      // for youtube url's remove the search params except 'v'
      // this is useful for video url's from playlist - example below:
      // https://www.youtube.com/watch?v=VQut4xOcPvE&list=PLFwqDjxup1l2dN53NoPhBvLSJWtN6pZ3o&index=35
      // https://www.youtube.com/watch?app=desktop&v=ov7seVpQ-ig&embeds_referring_euri=https%3A%2F%2Fdev.to%2F&feature=emb_imp_woyt

      const searchParamKeys = [];
      for (const key of url.searchParams.keys()) {
        searchParamKeys.push(key);
      }

      if(searchParamKeys.length > 1) {
        searchParamKeys.forEach((key) => {
          if(key !== 'v') {
            url.searchParams.delete(key);
          }
        })
      }
      // url.host = ""; // remove the host - so that we only search for v=xxxx for the video
      // url.pathname = ""; // remove the pathname - so that we only search for v=xxxx for the video
    }
  }

  public async changeBlockMarker(uuid: string, marker: string) {
    const graph = await this.getGraph();
    const block = await this.getBlock(uuid, graph.name);

    if (block.content.includes('SCHEDULED:')) {
      return {
        type: 'change-block-marker-result',
        uuid: uuid,
        status: 'failed',
        msg: 'Not support scheduled task.',
      };
    }
    block.content = block.content.replace(block.marker, marker);

    const result = await this.logseqClient.updateBlock(block);
    console.debug(result);
    if (Object.hasOwnProperty(result, 'error')) {
      return {
        type: 'change-block-marker-result',
        uuid: uuid,
        status: 'failed',
        msg: 'error',
      };
    }
    return {
      type: 'change-block-marker-result',
      uuid: uuid,
      status: 'success',
      marker: marker,
    };
  }
}
