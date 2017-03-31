# What does it do

This is a simple slideshow build upon the carrousel.
Because of this you can drag it using touchdevices and have snapping.


# Usage of CarrouselSlideshow

Add to your package.json peerDependencies:

```
"dompack-carrousel-slideshow": "https://github.com/WebHare/dompack-carrousel-slideshow"
```


import * as CarrouselSlideshow from "dompack-carrousel-slideshow";

Initializing:

```
  var slideshow = new CarrouselSlideshow(node, options);
```

Updating settings:
(FIXME: not implemented yet)

```
    slideshow.setOptions(options);
    slideshow.refresh();
```


# Options

- autoplay:               true
- autoplay_initialdelay
  delay the first start of autoplay to prevent having a lot of slideshows run in sync
- autoplay_freezeslideduration
  amount of milliseconds to keep the slide still (after the transition effect) before going to the next
- autoplay_staypausedfor
  amount of time to keep frozen after a mouseover (FIXME: not implemented yet)
- transitionDuration
- eventPassthrough
  makes vertical scrolling keep on working (however at the moment it can cause textual selections)
- jumpbuttons
  CSS selector (string), array with nodes or nodelist with jumpbuttons
- debug


# Future plans

- more effects?
