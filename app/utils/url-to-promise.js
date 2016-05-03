/* globals JSZipUtils */
import Ember from 'ember';

export default function urlToPromise(url) {
    return new Ember.RSVP.Promise(function(resolve, reject) {
        JSZipUtils.getBinaryContent(url, function (err, data) {
            if(err) {
                reject(err);
            } else {
                resolve(data);
            }
        });
    });
}
