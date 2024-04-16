import Browser from 'webextension-polyfill';
import { useEffect, useState } from 'react';
import React from 'react';
import { BlockSearchType, LogseqBlockType, LogseqSearchResult } from '@/types/logseqBlock';
import { IconSettings } from '@tabler/icons-react';
import { Accordion, AccordionItem, AccordionButton, AccordionPanel, AccordionIcon, Box, } from '@chakra-ui/react'

import { LogseqBlock } from '@components/LogseqBlock';

import styles from './index.module.scss';
import LogseqService from '@pages/logseq/service';

const service = new LogseqService();

export default function Popup() {
  const [isLoading, setIsLoading] = useState(false);
  const [logseqSearchResult, setLogseqSearchResult] =
    React.useState<LogseqSearchResult>();

  const mountOpenPageMethod = () => {
    const innerFunction = () => {
      if (isLoading) return;
      document.querySelectorAll('a').forEach((e) => {
        if (e.onclick === null) {
          e.onclick = () => {
            Browser.runtime
              .sendMessage({
                type: 'open-page',
                url: e.href,
              })
              .then(() => window.close());
          };
        }
        if (!isLoading) {
          clearInterval(interval);

        }
      });
    };
    const interval = setInterval(innerFunction, 50);
  };

  useEffect(() => {
    if (isLoading) return;

    new Promise(async () => {
      let queryOptions = { active: true, lastFocusedWindow: true };
      let [tab] = await Browser.tabs.query(queryOptions);
      setIsLoading(true);
      if (!tab || !tab.url) return;

      const tabURL = new URL(tab.url);
      const result = await service.urlSearch(tabURL, tab.title ?? "", { fuzzy: true });

      // console.log({ result })
      if (result.status !== 200) return;

      setLogseqSearchResult(result.response!);
      mountOpenPageMethod();
    });
  }, []);

  const openSettingsPage = () => {
    Browser.runtime.sendMessage({ type: 'open-options' });
  };

  const groupedBlocks = logseqSearchResult?.blocks.reduce((groups: Record<string, Record<string, LogseqBlockType[]>>, item: LogseqBlockType) => {
    if (groups.default === undefined) groups.default = {};
    if (item.blockSearchType && groups[item.blockSearchType] === undefined) {
      groups[item.blockSearchType] = {};
    };
    const searchTypeGroup = item.blockSearchType ? groups[item.blockSearchType] : groups.default;
    const group = (searchTypeGroup[item.page.name] || []);
    group.push(item);
    searchTypeGroup[item.page.name] = group;
    return groups;
  }, { default: {} });

  return (
    <div className="copilot popup">
      <div className={styles.content}>
        <div className={styles.copilotCardHeader}>
          <span>Graph: {logseqSearchResult?.graph}</span>
          <IconSettings size={16} onClick={openSettingsPage} />
        </div>
        {/* {logseqSearchResult?.blocks.slice(0, 20).map((block) => ( */}
        <Accordion defaultIndex={[0]} allowToggle>
          {logseqSearchResult && groupedBlocks && Object.entries(groupedBlocks).map(([key, searchTypeGroupBlocks], i) => {
            // return blockGroup.map((block) => {
            let blockCount = 0;
            // console.log({ searchTypeGroupBlocks })
            const searchQuery = Object.keys(searchTypeGroupBlocks).length > 0 ? searchTypeGroupBlocks[Object.keys(searchTypeGroupBlocks)[0]][0].searchQuery : "";
            const logseqPageBlocks = Object.entries(searchTypeGroupBlocks).map(([key, allBlocksinPage], i) => {
              blockCount += allBlocksinPage.length;
              return (
                <LogseqBlock key={key} blocksPerPage={allBlocksinPage} graph={logseqSearchResult.graph} isPopUp={true} />
              )
            });
            // });

            const blockCountInfo = `(${logseqPageBlocks.length}-pages, ${blockCount}-blocks)`;
            const accordianTitle = (
              key == "default" ? "Default Search" :
                `this block is a result of ${key} - ` +
                `${key == BlockSearchType.FUZZY_URL ? "searching the website domain" : "searching the webpage title"}`
            ) + ` - ${blockCountInfo}`

            return (
              <>
                {logseqPageBlocks.length > 0 ?
                  <AccordionItem className={`rounded-lg ${styles.accordianItem}`}>
                    <p>
                      <AccordionButton _expanded={{ bg: 'darkslateblue', color: 'white' }}
                        title={accordianTitle}
                      >
                        <Box style={{ display: "flex", maxWidth: "95%" }} as="span" flex='1' textAlign='left'>
                          <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {searchQuery ?? "" + " " + blockCountInfo}
                          </span>
                          {/* {key !== "default" && */}
                          <span className={styles.popupGroupToolTip}
                            title={searchQuery ? `Search Query(${key}): ${searchQuery}` : ""}
                          >
                            🔍
                          </span>
                          {/* } */}
                        </Box>
                        <AccordionIcon />
                      </AccordionButton>
                    </p>
                    <AccordionPanel pb={4} className={styles.accordianPanel}>
                      {logseqPageBlocks}
                    </AccordionPanel>
                  </AccordionItem>
                  // <details open>
                  //   <summary>
                  //     {`${key} (${logseqPageBlocks.length}-pages, ${blockCount}-blocks)`}
                  //     {key !== "default" && 
                  //       <span className={styles.popupGroupToolTip} 
                  //         title={`this block is a result of ${key} - ${ key == BlockSearchType.FUZZY_URL ? "searching the website domain" : "searching the webpage title"}`}
                  //       >
                  //         🔍
                  //       </span>
                  //     }
                  //   </summary>
                  //   {logseqPageBlocks}
                  // </details>
                  : <></>
                }
              </>
            )
          })}
        </Accordion>
        {/* ))} */}
      </div>
    </div>
  );
}
