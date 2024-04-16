import { LogseqPageIdenity } from '@/types/logseqBlock';

import styles from './logseq.module.scss';

type LogseqPageLinkProps = {
  page: LogseqPageIdenity;
  graph: string;
  isPopUp?: boolean;
};

const LogseqPageLink = ({
  page,
  graph,
}: LogseqPageLinkProps) => {

  if (page === undefined || page?.name === undefined || page?.originalName === undefined) {
    return <></>;
  }

  const pagePath = page.originalName.split("/")
  const pageName = pagePath.splice(-1)[0].trim(); // note splice remove item from original array

  return (
    <>
      <a
        className={styles.logseqPageLink}
        href={`logseq://graph/${graph}?page=${page?.name}`}
        title={page?.originalName}
      >
        <span className="tie tie-page"></span>
        <span>{pageName}</span>
        {pagePath.length > 0 && (
          <small>
            {` (${pagePath.join("/")})`}
          </small>
        )}
      </a>
    </>
  );
};

export default LogseqPageLink;
