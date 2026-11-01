# qrwty <!-- omit from toc -->

[qrwty](https://qrwty.io) grew out of a [brainstorm about QR-code tracking](https://github.com/ashfordhill/brainstorm/blob/main/archives/QR%20Code%20Tracking/README.md), which spawned from a [local neighborhood project](https://github.com/ashfordhill/qr-code-tracking). The original niche use case involved hardware: I wanted to record where I installed QR codes using my phone's GPS while I was running around placing posters & QR codes in random spots.

- [Business value?](#business-value)
  - [What about custom hardware?](#what-about-custom-hardware)
- [Research notes](#research-notes)
- [Future moves](#future-moves)

## Business value?

Even while exploring whether QR-code tracking could become a profitable business, I was doubtful:

- The first use case—tracking engagement with posters—felt too niche. 
- As a general QR analytics use case, there are already plenty of existing solutions for that, which puts pressure on pricing for new competitors.

QR-code tracking is already offered by SaaS companies such as:

- [Uniqode](https://www.uniqode.com/)
- [QR.io](https://qr.io/)
- [Hovercode](https://hovercode.com/)

Analytics can make QR codes useful in many settings, including on physical products. 

I am uneasy about competing in a market where success may depend more on winning business deals than on building the best product. Reaching those deals often takes a sales-oriented person with the time and network to build relationships, which is not my forte.

### What about custom hardware?

One possible way for `qrwty` to stand out was custom hardware: print an outdoor-ready thermal label and record its location on the spot, as I wanted to do for the neighborhood tree-poster project. Since a smartphone and a printer can already handle this, custom hardware is not worth exploring.

## Research notes

I asked several frontier AI models to research the business idea. Their semi-slop findings were not compelling enough to change my initial doubts:

- The QR-code SaaS market is crowded.
- An [open-core](./business-analysis/ai-generated-reports-fable-5.1/README.md#g-open-core) model with enterprise hosting *might* be worth exploring.
- Custom hardware appears unnecessary and could distract from the software opportunity.
- Small, local use cases like poster tracking may take more effort to sell and support than they can justify.

## Future moves

Qrwty can still serve as a guinea pig for a software design generation project I'm working on - if a large chunk of the infrastructure can be generated well for a service like this, then great. Further exploration would (hopefully) not take as much time.