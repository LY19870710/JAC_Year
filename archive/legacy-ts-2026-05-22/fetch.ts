import { JACFetcher } from './fetcher';

const year = parseInt(process.argv[2]) || new Date().getFullYear();
const fetcher = new JACFetcher();

fetcher.fetchYear(year)
  .then(count => {
    console.log(`\nTotal: ${count} articles fetched for ${year}`);
    fetcher.close();
  })
  .catch(err => {
    console.error('Error:', err);
    fetcher.close();
    process.exit(1);
  });
