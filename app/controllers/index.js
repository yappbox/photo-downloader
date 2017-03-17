/* globals Papa, JSZip, saveAs */
import Ember from 'ember';
import urlToPromise from '../utils/url-to-promise';

const { computed, isEmpty } = Ember;

const NUM_FILES_PER_GROUP = 110;

export default Ember.Controller.extend({
  csvText: null,
  records: null,
  groups: computed('records.[]', function(){
    let ret = [];
    let records = this.get('records') || [];
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
      let csv = this.get('csvText');
      let results = Papa.parse(csv, {
        header: true
      });
      this.set('records', results.data.map((record)=>{
        return {
          timestamp: record['Created At'],
          uploader: record['Author'],
          url: record['Image URL']
        };
      }).filter((record) => {
        return !isEmpty(record.url);
      }));
    },
    download(group) {
      let zip = new JSZip();
      let images = zip.folder(`images-${group.num}`);
      this.set('isDownloading', true);
      this.set('error', null);
      group.records.forEach((record) => {
        let timestamp = record.timestamp;
        let uploader = record.uploader;
        let filename = 'uploaded-at-' + timestamp.replace(/[ :]/g, "-") + '__' + uploader.replace(/ /g, "-") + '.jpg';
        images.file(filename, urlToPromise(record.url), {binary:true});
      });
      zip.generateAsync({type:"blob"}, (metadata) => {
        Ember.run(() =>{
          this.set('progress', metadata.percent);
          if (metadata.currentFile) {
            this.set('currentFile', metadata.currentFile);
          }
        });
      }).then((blob) => {
          // see FileSaver.js
          saveAs(blob, `images-${group.num}.zip`);
          Ember.run(() =>{
            this.set('isDownloading', false);
          });
      }).catch((e) => {
        Ember.run(() =>{
          this.set('error', e);
          this.set('isDownloading', false);
        });
      });
    }
  }
});
