/* globals Papa, JSZip, saveAs */
import { run } from '@ember/runloop';

import Controller from '@ember/controller';
import { computed } from '@ember/object';
import { isEmpty } from '@ember/utils';
import urlToPromise from '../utils/url-to-promise';

const NUM_FILES_PER_GROUP = 110;

export default Controller.extend({
  csvText: null,
  records: null,
  progress: 0,
  groups: computed('records.[]', function(){
    let ret = [];
    let records = this.records || [];
    let i = 0;
    while (i < records.length) {
      let group = {};
      ret.push(group);
      group.num = ret.length;
      group.records = records.slice(i, i + NUM_FILES_PER_GROUP);
      group.startingTimestamp = group.records[0].timestamp;
      group.endingTimestamp = group.records[group.records.length - 1].timestamp;
      i = i + NUM_FILES_PER_GROUP;
    }
    return ret;
  }),
  actions: {
    parse(){
      let csv = this.csvText;
      let results = Papa.parse(csv, {
        header: true
      });
      this.set('records', results.data.map((record)=>{
        return {
          timestamp: record['Created At'],
          uploader: record['Author'],
          url: record['Media URL']
        };
      }).filter((record) => {
        return !isEmpty(record.url);
      }));
    },
    download(group) {
      let zip = new JSZip();
      let media = zip.folder(`media-${group.num}`);
      this.set('isDownloading', true);
      this.set('error', null);
      group.records.forEach((record) => {
        let timestamp = record.timestamp;
        let uploader = record.uploader;
        let extension = new URL(record.url).pathname.split('.').reverse()[0];
        
        let filename = 'uploaded-at-' + timestamp.replace(/[ :]/g, "-") + '__' + uploader.replace(/ /g, "-") + '.' + extension;
        media.file(filename, urlToPromise(record.url), {binary:true});
      });
      zip.generateAsync({type:"blob"}, (metadata) => {
        run(() =>{
          this.set('progress', metadata.percent || 0);
          if (metadata.currentFile) {
            this.set('currentFile', metadata.currentFile);
          }
        });
      }).then((blob) => {
          // see FileSaver.js
          saveAs(blob, `media-${group.num}.zip`);
          run(() =>{
            this.set('isDownloading', false);
          });
      }).catch((e) => {
        run(() =>{
          this.set('error', e);
          this.set('isDownloading', false);
        });
      });
    }
  }
});
