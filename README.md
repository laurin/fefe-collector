# fefe-collector

Scrapes, saves and tags [fefe-blog-articles](https://blog.fefe.de/) in a specific time frame. Also prints some tag stats.  
Outputs the tagged articles as json and as jsonl ready for [openai fine-tuning](https://platform.openai.com/docs/guides/fine-tuning).  

*Disclaimer: this is just quickly hacked together.*

## Usage

```bash
# once after pull
npm install

# run
npm run dev
```

## useful openai commands
```bash
# prepare data for training (validate, remove duplicates, etc.)
openai tools fine_tunes.prepare_data -f data/data.jsonl
# start training
openai api fine_tunes.create -t data/data_prepared.jsonl -m ada --suffix fefe-2
# view all fine tuning jobs, to check status of created job
openai api fine_tunes.list
# cancel a fine tuning job
openai api fine_tunes.cancel -i ${FINE_TUNE_JOB_ID}
```