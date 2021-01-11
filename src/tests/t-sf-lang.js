import {language} from "../index.js";
import {adder, minimalTest, windowTest} from "./t-shared.js";

language.default = 'en_US';
language.add('en_US', {
  translated:"translated {data}[b:bo {data} ld]"+adder,
  hello:{
    other:{
      side:"Hello from the [b:other] side"+adder
    }
  },
  "i'm":{
    here:"I'm on here!"
  },
  custom:{
    el:{
      iB1:"Variable content: {inputBinding1} [b:hay] nyam {inputBinding2.text} [b:ahoy]",
      iB2:"Above content: {inputBinding2.text}",
      iB3:"It's {inputBinding2.text}"
    }
  },
  test:{complex:'custom {data} [b:{item}] here'}
});
language.add('id_ID', {
  translated:"terjemahankan [b:bold] {data}"+adder,
  custom:{
    el:{
      iB1:"Kontent variabel: {inputBinding2.text} nyam [b:halo] {inputBinding1} [b:uhay]"+adder,
      iB2:"Kontent diatas: {inputBinding2.text}",
      iB3:"Itu adalah {inputBinding2.text}"+adder
    }
  },
  hello:{
    other:{
      side:"Halo dari sisi [b:lain]"+adder
    }
  },
  "i'm":{
    here:"Aku disini!"
  },
  test:{complex:'contoh {data} disini [b:{item}]'}
});

language.serverURL = '/tests/lang/*.json';
language.changeDefault('id_ID');

var obj = {};
language.assign(obj, {
  chicken:'stuff.chicken',
  game:'stuff.game'
}, function(){
  console.warn('lang stuff', obj);
});

language.get(['stuff.game', 'another.day'], function(values){
  console.warn('lang multiple', values);
});

language.get('another.friend', function(values){
  console.warn('lang single', values);
});
