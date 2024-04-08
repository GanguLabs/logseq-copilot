import React from 'react';
import { LogseqSearchResult } from '@/types/logseqBlock';
import { LogseqResponseType } from '../logseq/client';
import Browser from 'webextension-polyfill';
import styles from './index.module.scss';
import LogseqCopilot from '@components/LogseqCopilot';
type LogseqCopliotProps = {
  connect: Browser.Runtime.Port;
  searchQuery: string;
};

export const LogseqCopliot = ({ connect, searchQuery }: LogseqCopliotProps) => {
  const [msg, setMsg] = React.useState('Loading...');
  const [logseqSearchResult, setLogseqSearchResult] =
    React.useState<LogseqSearchResult>();

  connect.onMessage.addListener(
    (resp: LogseqResponseType<LogseqSearchResult>) => {
      console.log('resp', resp);
      setMsg(resp.msg);
      setLogseqSearchResult(resp.response);
    },
  );

  const goOptionPage = () => {
    Browser.runtime.sendMessage({ type: 'open-options' });
  };

  const statusShower = () => {
    if(msg === 'error'){
      return (
        <div>
          <p>Something went wrong</p>
        </div>
      )
    } else
    if (msg === 'success' || msg === "no results") {
      return (
        <LogseqCopilot
          searchQuery={searchQuery}
          graph={logseqSearchResult?.graph || ''}
          blocks={logseqSearchResult?.blocks || []}
          pages={logseqSearchResult?.pages || []}
        />
      );
    } else if (msg !== 'Loading') {
      return (
        <button className={styles.configIt} onClick={goOptionPage}>
          Config it
        </button>
      );
    }
    return <></>;
  };

  return (
    <div className={styles.copilot}>
      <div className={styles.copilotBody}>{statusShower()}</div>

      <div className={styles.copilotFooter}>
        <span>
          <a href="https://github.com/EINDEX/logseq-copilot/issues">Feedback</a>
        </span>
        <span>
          power by{' '}
          <a href="https://logseq-copilot.eindex.me/">Logseq Copliot</a>
        </span>
      </div>
    </div>
  );
};
