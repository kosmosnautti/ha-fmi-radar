const LitElement = customElements.get("hui-masonry-view") ? Object.getPrototypeOf(customElements.get("hui-masonry-view")) : Object.getPrototypeOf(customElements.get("hui-view"));
const html = LitElement.prototype.html;

class FmiRadar extends HTMLElement {
  set hass(hass) {
    if (!this.content) {
      this.innerHTML = `
        <ha-card style="overflow:clip;">
          <div class="card-content" style="padding: 0px;"></div>
        </ha-card>
      `;
      
      this.content = this.querySelector('div');
      this.idx = 0;
      this.jsonUrls = [];
      this.radarImages = [];
      
      if (String(this.config.station_id).includes('suomi')) {
        if (this.config.station_id == 'suomi1h') {
          this.jsonUrls.push('https://cdn.fmi.fi/apps/list-finland-radar-images/index.php?product-id=' + this.config.station_id + '&isforecast=false');
          this.jsonUrls.push('https://cdn.fmi.fi/apps/list-finland-radar-images/index.php?product-id=' + this.config.station_id + '&isforecast=true');
        } else {
          this.jsonUrls.push('https://cdn.fmi.fi/apps/list-finland-radar-images/index.php?product-id=' + this.config.station_id + '&flash=true');
        }
      }else {
        this.jsonUrls.push('https://cdn.fmi.fi/apps/list-local-weather-radar-images/index.php?lang=fi&station=' + this.config.station_id + '&timezone=UTC');
      }
      
      this.getImages(0, this.jsonUrls.length);
    }
  }
  
  getImages = (i, len) => {
    if (i >= len) {
      this.renderCard();
      this.startSlideshow();
      return;
    }
    
    let req = new XMLHttpRequest();
    req.open('GET', this.jsonUrls[i]);
    req.onreadystatechange = () => {
      if(req.readyState === XMLHttpRequest.DONE && req.status === 200) {
        try {
          let jsonData = JSON.parse(req.responseText);
          this.radarImages = [...this.radarImages, ...jsonData.images];
          this.getImages(i + 1, len);
        } catch(e) {
          throw new Error('Ilmatieteen laitokselta vastaanotettu JSON on virheellinen: ' + e);
        }
      }
    }
    req.send();
  }
  
  renderCard = () => {
    this.translation = { 'ylä': 'top', 'ala': 'bottom', 'vasen': 'left', 'oikea': 'right' };
    this.radarImages.forEach((image) => {
      let radarImgContainer = document.createElement('div');
      radarImgContainer.className = 'fmi-radar-image';
      radarImgContainer.style = 'display: none; padding: 0px;';
      let radarImg = document.createElement('img');
      radarImg.src = image.url;
      radarImg.style = 'display: block; width: 100%;';
      let radarTime = document.createElement('div');
      radarTime.className = 'radar-time';
      radarTime.style = 'position: absolute; ' + this.translation[this.config.time_vertical_pos] + ': 16px; ' + this.translation[this.config.time_horizontal_pos] + ': 16px; font-weight: ' + this.config.time_font_weight + '; font-size: ' + this.config.time_font_size + 'em; color: ' + this.config.time_font_color + ';';
      let radarTimeDate = new Date(image.epoch);
      let radarTimeStr;
      if (!this.config.time_prefix) {
        radarTimeStr = radarTimeDate.getDate() + '.' + (radarTimeDate.getMonth()+1) + '. ' + ('0' + radarTimeDate.getHours()).slice(-2) + ':' + ('0' + radarTimeDate.getMinutes()).slice(-2);
      } else {
        radarTimeStr = radarTimeDate.getDate() + '.' + (radarTimeDate.getMonth()+1) + '. ' + this.config.time_prefix + ' ' + ('0' + radarTimeDate.getHours()).slice(-2) + ':' + ('0' + radarTimeDate.getMinutes()).slice(-2);
      }
      radarTime.textContent = radarTimeStr;
      radarImgContainer.appendChild(radarImg);
      radarImgContainer.appendChild(radarTime);
      this.content.appendChild(radarImgContainer);
    });
    
    if (this.config.overlay) {
      try {
        let jsonOverlay = JSON.parse(this.config.overlay);
        for (const [objName, objData] of Object.entries(jsonOverlay)) {
          if ('css' in objData) {
            let objOverlay = document.createElement('div');
            objOverlay.className = 'radar-overlay';
            objOverlay.id = objName;
            objOverlay.style = 'position: absolute; ' + objData.css;
            if ('teksti' in objData) {
              objOverlay.textContent = objData.teksti;
            }
            this.content.appendChild(objOverlay);
          }
        }
      } catch(e) {
        throw new Error('Kuvan päälle lisättävien elementtien JSON on virheellinen: ' + e);
      }
    }
  }
  
  startSlideshow = () => {
    let x = this.content.querySelectorAll('.fmi-radar-image');
    for (let i = 0; i < x.length; i++) {
      x[i].style.display = 'none';
    }
    this.idx++;
    if (this.idx > x.length) {this.idx = 1}
    x[this.idx-1].style.display = 'block';
    this.slideshow_id = setTimeout(this.startSlideshow, this.config.speed_ms);
  }
  
  setConfig(config) {
    if (!config.station_id) {
      throw new Error('Määritä "station_id" konfiguraattorissa (Ilmatieteen laitoksen kohteen ID)');
    }
    if (!config.speed_ms) {
      throw new Error('Määritä "speed_ms" konfiguraattorissa (tutkakuvien siirtymäaika millisekunteina)');
    }
    if (!config.time_horizontal_pos || (config.time_horizontal_pos !== 'vasen' && config.time_horizontal_pos !== 'oikea')) {
      throw new Error('Määritä "time_horizontal_pos" konfiguraattorissa (tutkakuvan päälle tulevan päivämäärän ja kellonajan vaakasuuntainen sijainti, vasen tai oikea)');
    }
    if (!config.time_vertical_pos || (config.time_vertical_pos !== 'ylä' && config.time_vertical_pos !== 'ala')) {
      throw new Error('Määritä "time_vertical_pos" konfiguraattorissa (tutkakuvan päälle tulevan päivämäärän ja kellonajan pystysuuntainen sijainti, ylä tai ala)');
    }
    if (!config.time_font_weight) {
      throw new Error('Määritä "time_font_weight" konfiguraattorissa (tutkakuvan päälle tulevan päivämäärän ja kellonajan fontin paksuus)');
    }
    if (!config.time_font_size) {
      throw new Error('Määritä "time_font_size" konfiguraattorissa (tutkakuvan päälle tulevan päivämäärän ja kellonajan fontin koko em:nä)');
    }
    if (!config.time_font_color) {
      throw new Error('Määritä "time_font_color" konfiguraattorissa (tutkakuvan päälle tulevan päivämäärän ja kellonajan fontin väri)');
    }
    this.config = config;
    
    if (this.slideshow_id) {
      clearTimeout(this.slideshow_id);
    }
    if (this.content) {
      while (this.content.firstChild) {
        this.content.removeChild(this.content.firstChild);
      }
      delete this.content;
    }
  }
  
  static getStubConfig() {
    return { station_id: 100971, speed_ms: 500, time_horizontal_pos: 'vasen', time_vertical_pos: 'ylä', time_font_weight: 400, time_font_size: 1.5, time_font_color: 'black', time_prefix: 'klo.' }
  }
  
  static getConfigElement() {
    return document.createElement('fmi-radar-editor');
  }
}

class FmiRadarEditor extends LitElement {
  static get properties() {
    return {
      hass: {},
      config: {},
    };
  }
  
  setConfig(config) {
    this.config = config;
  }
  
  valueChanged(ev) {
    const config = Object.assign({}, this.config);
    const target = ev.target;
    
    if (config[target.configValue] == target.value) {
      return;
    }
    if (target.configValue) {
      if (target.value === "") {
        delete config[target.configValue];
      } else {
        config[target.configValue] = target.value;
      }
    }
    
    this.config = config;
    const event = new CustomEvent('config-changed', {
      detail: { config: config },
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(event);
  }
  
  render() {
    if (!this.hass || !this.config) {
      return html``;
    }
    
    return html`
      <div class="card-config">
        <div>
          <p>Voit käyttää Ilmatieteen laitoksen kohteen ID:n tilalla myös arvoja <b>suomi1h</b>, <b>suomi</b>, <b>etela-suomi</b>, <b>keski-suomi</b> tai <b>pohjois-suomi</b> saadaksesi laajemman tutkakuvan.</p>
          <paper-input
            label="Ilmatieteen laitoksen kohteen ID"
            .value="${this.config.station_id}"
            .configValue="${"station_id"}"
            @focusout="${this.valueChanged}"
          ></paper-input>
          <paper-input
            label="Tutkakuvien siirtymäaika millisekunteina"
            type="number"
            .value="${this.config.speed_ms}"
            .configValue="${"speed_ms"}"
            @focusout="${this.valueChanged}"
          ></paper-input>
          <paper-input
            label="tutkakuvan päälle tulevan päivämäärän ja kellonajan vaakasuuntainen sijainti (vasen tai oikea)"
            .value="${this.config.time_horizontal_pos}"
            .configValue="${"time_horizontal_pos"}"
            @focusout="${this.valueChanged}"
          ></paper-input>
          <paper-input
            label="Tutkakuvan päälle tulevan päivämäärän ja kellonajan pystysuuntainen sijainti (ylä tai ala)"
            .value="${this.config.time_vertical_pos}"
            .configValue="${"time_vertical_pos"}"
            @focusout="${this.valueChanged}"
          ></paper-input>
          <paper-input
            label="Tutkakuvan päälle tulevan päivämäärän ja kellonajan fontin paksuus"
            type="number"
            .value="${this.config.time_font_weight}"
            .configValue="${"time_font_weight"}"
            @focusout="${this.valueChanged}"
          ></paper-input>
          <paper-input
            label="Tutkakuvan päälle tulevan päivämäärän ja kellonajan fontin koko (em)"
            type="number"
            .value="${this.config.time_font_size}"
            .configValue="${"time_font_size"}"
            @focusout="${this.valueChanged}"
          ></paper-input>
          <paper-input
            label="Tutkakuvan päälle tulevan päivämäärän ja kellonajan fontin väri"
            .value="${this.config.time_font_color}"
            .configValue="${"time_font_color"}"
            @focusout="${this.valueChanged}"
          ></paper-input>
          <paper-input
            label="Kellonajan etuliite tutkakuvan päälle tulevassa päivämäärän ja kellonajan tekstirivissä"
            .value="${this.config.time_prefix}"
            .configValue="${"time_prefix"}"
            @focusout="${this.valueChanged}"
          ></paper-input>
          <paper-input
            label="Kuvan päälle lisättävät elementit JSON-muodossa"
            .value="${this.config.overlay}"
            .configValue="${"overlay"}"
            @focusout="${this.valueChanged}"
          ></paper-input>
        </div>
      </div>
    `;
  }
}

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'fmi-radar',
  name: 'Ilmatieteen laitoksen sadetutka- ja salamahavainnot',
  preview: false,
  description: 'Ilmatieteen laitoksen sadetutka- ja salamahavainnot kuvaesityksenä',
});

customElements.define('fmi-radar', FmiRadar);
customElements.define('fmi-radar-editor', FmiRadarEditor);
console.info('%c FMI-Radar Card %c v0.02 ', 'color: orange; font-weight: bold; background: black', 'color: white; font-weight: bold; background: dimgray');