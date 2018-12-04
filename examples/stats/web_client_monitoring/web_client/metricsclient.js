/**
 * Copyright 2018, Google, Inc.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/** 
 * A Common JS module for proxying monitoring and trace calls to the server
 */

/**
 * A class to collect web metrics and send them to the server
 */
class WebMetrics {

  /**
   * Creates a WebMetrics instance
   * @param {string} incrementbutton - ID of the increment button DOM element
   * @param {string} flushbutton - ID of the flush button DOM element
   */
  constructor(incrementbutton, flushbutton) {
    this.click_counter_ = 0;
    const wm = this;
    const incrementbtn = document.querySelector(incrementbutton);
    incrementbtn.onclick = function() {
      wm.click_counter_++;
    }
    const flushbtn = document.querySelector(flushbutton);
    flushbtn.onclick = function() {
      wm.post_data_(wm.click_counter_);
    }
  }

  /**
   * Send the metrics data to the server
   * @private
   */
  post_data_(count) {
    const pageNav = performance.getEntriesByType("navigation")[0];
    const dnsTime = pageNav.domainLookupEnd - pageNav.domainLookupStart;
    const connectTime = pageNav.connectEnd - pageNav.connectStart;
    const ttfb = pageNav.responseStart - pageNav.requestStart;
    const totalTime = pageNav.responseEnd - pageNav.requestStart;
    const data = {
      dnsTime: dnsTime,
      connectTime: connectTime,
      ttfb: ttfb,
      totalTime: totalTime,
      count: count
    }
    fetch("/metrics", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify(data), // body data type must match "Content-Type" header
    })
    .then(function(response) {
      if(response.ok) {
        console.log("Data received");
      } else {
        console.log("Error sending data");
      }
    });
  }
}

module.exports = WebMetrics
