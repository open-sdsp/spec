# Streaming Data Sync Protocol v0.1

The Streaming Data Sync Protocol (SDSP) allows publishers of realtime data to efficiently synchronize an object with decoupled subscribers. The protocol is designed to be interoperable with any underlying platforms and transports. The protocol is particularly effective when there is a single publisher and one or more decoupled subscribers (pub/sub pattern).

Unlike the many protocols that exist today enabling sync between publishers and subscribers, SDSP is designed to be agnostic in regards to the underlying streaming/realtime protocol, the data model and payload, the delta algorithm, the optional history retrieval feature and the platform. Additionally, the publisher can be decoupled from subscribers. For example, a protocol such as Meteor DDP may appear to have similar goals, yet it requires the publisher and subscriber to be coupled and communicate directly, it has limitations in terms of payload types that can be synchronized and is primarily designed for bi-directional synchronization.

SDSP is therefore a good fit when:

* You want to publish objects and subsequent changes in real time from typically one publisher to any number of subscribers
* Your data objects are sufficiently large that sending a delta for each update is more efficient than republish the entire object (as a guide, objects over 1KB normally satisfy this requirement)
* You have any underlying stream, realtime transport or queue (such as a WebSocket, Kafka, AMQP or Ably) to publish data deltas to subscribers
* You want the data sync updates to be portable without any coupling to the publisher. For example, a publisher could publish an update over HTTP, that data could be republished by a 3rd party into a queue, and then later be exposed to another 3rd party over Pub/Sub channels. The subscriber should be able to trivially reconstruct the entire data object without any access to the publisher or its systems
* Optionally, if you are publishing large objects that are unsuitable for the underlying transport due to their size, you have another storage mechanism such as Amazon S3 or Google Cloud Storage

For more background information on the motivation for this spec, please read the [vendor neutral open approach to decoupled data synchronization article](https://blog.ably.io/a-vendor-neutral-open-approach-to-decoupled-data-synchronization-26d8914cb28b).

## Table of contents

* [Protocol goals](#protocol-goals)
* [SDSP Spec v0.1](#sdsp-spec-v0.1)
  * [Definitions](#definitions)
  * [Publisher](#publisher)
  * [Subscriber](#subscriber)
  * [Data Frame](#data-frame)
  * [Recommendations and considerations](#recommendations-and-considerations)
* [Code examples](#code-examples)
* [Contributing](#contributing)
* [Related reading](#related-reading)

## Protocol goals

* **Minimal complexity** - implementing a publisher or subscriber from scratch should be simple
* **Bandwidth efficiency** - simplicity and portability takes precedence over bandwidth efficiency, however the protocol must be sufficiently efficient to make it useful
* **Portability** - the protocol aims to be sufficiently portable to operate on top of any streaming, realtime or queuing protocols, use any storage mechanism, allow any delta algorithm to be used and support any payload type
* **Decoupled** - the subscriber should never need to contact the publisher to reconstruct the original object and apply updates it receives
* **Plug-in design** - the libraries developed to implement this protocol should aim to be portable and not couple themselves to any realtime, streaming or storage technology. Instead, a plug-in design should be used for the transport, storage, history etc.
* **Open protocol** - this is a fledgling protocol at present, however contributions from the community and vendors are not only welcome, but necessary to make this protocol useful. We hope in time, a number of free and open source libraries will be made available using this protocol and the standard could be more [officially defined](https://en.wikipedia.org/wiki/Open_standard)

## Visualised

### Typical coupled data synchronization

![Coupled data sync](https://cdn-images-1.medium.com/max/1600/1*-QeIUJ5_-KK5RUtNMw99tw.png)

Source: [Vendor neutral open approach to decoupled data synchronization article](https://blog.ably.io/a-vendor-neutral-open-approach-to-decoupled-data-synchronization-26d8914cb28b)

### Proposed decoupled data synchronization

![Decoupled data sync](https://cdn-images-1.medium.com/max/1600/1*wsPd6ejZHvrc_SjwC4UHOw.png)

Source: [Vendor neutral open approach to decoupled data synchronization article](https://blog.ably.io/a-vendor-neutral-open-approach-to-decoupled-data-synchronization-26d8914cb28b)

## SDSP Spec v0.1

### Definitions:

* "**Delta Algorithm**" is the algorithm used to generate a delta between two Objects.
* "**Data Frame**" is the data structure that is published over the Transport by a Publisher that includes one or more of: the data delta generated from the old and new object or the underlying applied change; the unique incrementing serial number; the Object UID; the delta algorithm used
* "**History Plug-in**" is a required plug-in, that using a pre-defined interface, allows the Library to retrieve Transport History in a uniform way. Some plug-ins may be bundled with the Library, however the Library must support 3rd party plug-ins
* "**Library**" is the client library that is used to create Data Frames ready for publishing on the Transport, and also consume Data Frames received from the Transport. The Library additionally provides APIs to generate data deltas from old and new Objetcts and publish and retrieves Object from an Object Storage Location
* "**Object Storage Location**" is a URI, preferably accessible over the Internet (this may not always be possible), containing the location of
* "**Object Storage Plug-in**" is an optional plug-in, that using a pre-defined interface, allows the Library to persist an Object and generate a URI and Object UID. Object Storage is most commonly used to avoid publishing large Objects on the Transport
* "**Object UID**" is the unique identifier assigned to an Object when persisted to the Object Storage Location. This can be assigned prior to being stored by the Publisher, or can be issued Storage service when issuing an Object Storage Location. In fact, the Object Storage Location itself is a UID, although it can be verbose and thus a shorted UID may be preferred.
* "**Object**" is an object, text or binary type that a Publisher wants to broadcast, along with any changes, to any number of subscribers. Subscribers consume Data Frames construct an Object that is kept in sync with each subsequent Data Frame
* "**Publisher**" is the device that is publishing the Object and generating Data Frames from the Library
* "**Storage**" is any available storage system that is used to store arbitrary binary or text objects
* "**Subscriber**" is the device that is consuming Data Frames and using the Library to construct the Object and emit updates
* "**Transport**" is any underlying delivery mechanism for the updates. This could for example be a realtime transport (such as a [pub/sub channel](https://en.wikipedia.org/wiki/Publish%E2%80%93subscribe_pattern)), a stream (such as Kafka), a message queue (such as AMQP) or even just a static representation of the data perhaps exposed over HTTP with periodic polling
* "**Transport History**" is a service that allows previously published Data Frames on the Transport to be retrieved upon request
* "**TTL**" (commonly know as Time to live) is the mechanism that limits the amount of time History and Objects are available for an Object to retrieve. It is recommended that any additional authentication information is required to retrieve the Object from this URI and should instead be embedded in the URI. If separate authentication credentials are required, it will likely make it more difficult for Subscribers to retrieve the Object

### Publisher

#### Object Setup

Before a Publisher can start the sync process for an object and publish deltas for Subscribers, the Object must be set up. This is achieved by broadcasting a Data Frame with either the complete Object, or the location of the object so that the subscriber can retrieve that object. In the case of very large objects, the latter is the recommended approach.

1. A unique ID must be assigned to every Object published over a Transport. It is recommended that this UID is a GUID, but this is not a requirement. The UID can either be assigned by the Publisher, or retrieved if and when the Object is persisted into Storage. If the Publisher assigns a UID, it is the responsibility of the Publisher to ensure the UID is unique. In the case that an Object is persisted into Storage, the URI itself could be used as the UID, or alternatively a UID returned in the response after storing the object in the Storage can be used. In this case, it is the responsibility of the Storage to ensure the UID is unique for each Object stored. When an Object Storage Plug-in is used, the plug-in will persist the object and always return an opaque URI and UID. There is no requirement that the UID and URI are the same and up to the Object Storage Plug-in
1. The first Data Frame that is published for an Object contains the `uid` assigned in the previous step, the `serial` attribute `0` and either a `dataUri` attributing with the Object Storage Location (allowing any Subscriber to retrieve the Object) or a `data` element containing the complete Object. Given all Transports have different constraints, it is at the discretion of the Publisher as to when an Object should be persisted in Storage or published in the `data` attribute.
1. The `ver` attribute (representing the version of the last published object) may optionally be included with the value `0`. However this is unnecessary as a missing value is considered to be `0`.

#### Object Deltas

For every update to an Object, the Publisher will generate a delta that allows all subscribers to keep their copy of the object in sync with the Publisher's Object. As this specification is intentionally portable and can use any Delta Algorithm, the Publisher may generate the delta itself from the old and new Objects, or simply publish an already generated delta provided by the caller. Some Delta Algorithms may in fact support only one of these two models.

1. Each Data Frame update contains a `uid` for the Object, and is assigned a new `serial` number which is one whole number higher than the previous `serial` for that Object UID. The `serial` number is an increment-only counter.
1. Every Data Frame must either contain a `delta` attribute with the delta based on the chosen Delta Algorithm to be applied to the Object at the previous `serial`, or it must contain a `data` Object or `dataUri` with a URI to the Object that will completely replace the previous Object. It is at the discretion of the Publisher to decide when to publish a complete object vs a delta, however in a lot of cases it is better to publish the entire Object again when the delta is greater in size than the Object itself, or perhaps the cumulative deltas are greater.
1. When a delta is published by specifying a `delta` attribute only, the Data Frame must contain the attribute `alg` with a Data Algorithm code. See the list of reserved codes below, custom algorithms are prefixed with `X-` such as `X-crdt`. Additionally, the `ver` number must be incremented by one whole number from the last Data Frame. When the Data Frame is missing a `ver` attribute, the assume value is `0`, and thus the first `delta` applied to a published Object is always `1`. Unlike `serial`, the version attribute is reset to zero whenever a new complete data object is published.
1. When a `data` or `dataUri` attribute is included, the `ver` attribute (representing the version of the last published object) may optionally be included with the value `0`. However this is unnecessary as a missing value is considered to be `0`.
1. It is never valid to provide both a `delta` and a `data` or `dataUri` attribute.
1. A reserved attribute `checksum` may optionally be specified when the `delta` attribute is present. It may contain an object with at least the attributes `val` and `type`. For Subscribers who want the additional assurity that the resulting Object after applying a delta is exactly the same as the Publisher's view, they can elect to compare the checksum of the modified Object and the Publisher's checksum. The `val` contains the  checksum string value, and the `type` attribute describes how the checksum is generated, such as `MD5`. However, given the `MD5` checksum needs to be applied to an encoded object, the `type` attribute may take the form `utf-8/MD5` which indicates that the object is first serialized to a `utf-8` string, and then encoded as `MD5`. Other than the defined attributes, the mechanism for generating and validating checksums it outside of the scope of this specification. It is considered unnecessary in general to generate a checksum as the combination of a `uid`, a `serial` and a determinstic delta algorithm ensures the Publisher and all Subscribers will always have the exact same objects unless there are platform incompatibilities or bugs in the delta libraries themselves.
1. The Data Frame may include a `meta` attribute. The Publisher can use this attribute to pass any arbitrary data that may be needed by the Publisher.

#### Object Freeze

When a Publisher wishes to inform all Subscribers that the Object will no longer be updated and is now frozen / immutable, a Data Frame can be published as follows:

1. The freeze Data Frame contains the `uid` for the Object. It is assigned a new `serial` number which is one whole number higher than the previous `serial` for that Object UID, and a new `ver` version which is one whole number higher than the previous `ver` for that Object UID. If the previous Object UID's attribute `ver` was omitted, then the `ver` attribute of the new Data Frame must be `1`.
2. The Data Frame additionally includes a `frozen` attribute with the value `true`.

### Subscriber

#### Object Setup

Subscribers consume Data Frames and construct the Object. A Subscriber will typically perform the setup either in response to the first Data Frame provided to it, or pre-emptively when the Transport provides a mechanism for the Subscriber to retrieve the last published Data Frame.

When the Subscriber Library is initialized, it may optionally be configured with a history plug-in, that using a generic interface, allows the Subscriber to request previous Data Frames from the Transport History service.

The process is as follows:

1. If a Subscriber wishes to pre-emptively construct the Object, the Subscriber will need a means to obtain the last published Data Frame or Object. If the history plug-inGiven the means to do this will probably be via a Publisher exposed API (such as REST), a bespoke API available in the Transport itself or via the history plug-in, it is difficult to define how this should be done in a portable way. As such, this specification makes no attempt to define how this feature should work. For Subscribers that have no means to obtain the last published Data Frame or Object, they must wait for the first Data Frame to be delivered before the Object can be constructed.
1. Once the last published Data Frame is received, the Subscriber will need to do the following to construct the Object:
  1. If the Data Frame includes a `data` or `dataUri` attribute, then the entire Object is available immediately by inspecting the `data` attibute or loading the Object from the `dataUri`. At this point no further work is necessary and the Object Setup is complete.
  1. If a `historyUri` attribute is present, then a request should be made to retrieve all historical Data Frames in a single request.
  1. Otherwise, it is up to the Subscriber to obtain the historical Data Frames using the Transport History. There is no defined means in this specification to obtain history as this is likely to be Transport specific, however if a `historyUri` is not present in each Data Frame, then the Subscriber must be configured with a history plug-in to ensure it can retrieve previous Data Frames as necessary. The history plugin is provided the Data Frame in order to retrieve the Data Frame history.
1. The `historyUri` and the history plug-in must return an array of Data Frames. It is the Library's responsibility to prepare the Data Frames by sorting them in descending order by `serial`, removing any duplicates and discarding any Data Frames with a serial greater than or equal to the last published Data Frame's serial. The Library should then iterate through the Data Frames ensuring the `ver` and `serial` attributes descrease by one until the Data Frame with and empty `ver` or `ver` `0` is reached. This Data Frame contains the last published complete Object.
1. The Library botains  the complete Object Data Frame and applies all Data Frame deltas

### Data Frame

The Data Frame is a data structure that is published on the Transport for the initial Object setup, and then for subsequent updates. It is not invalid to include additional arbitrary attributes in the Data Frame, however this may lead to unexpected behavior as this specification evolves and new attributes are added that may conflict. We recommend additional attributes are included in the `meta` attribute. If a new attribute is included in the root Data Frame object and it forms part of a proposed specification to include it as a documented supported attribute, we recommend prefixing the field with `X-` as a convention to indicate that this `X-` prefix may later be dropped.

#### Well-known Delta Algorithms

The following algorithms used to generate Deltas have the following reserved codes:

* `md` - [Myers Diff](http://blog.robertelder.org/diff-algorithm/)
* `jp` - [JSON Patch](http://jsonpatch.com/)

It is invalid to use these algorithm codes unless the target Delta Algorithm is being used.

If an algorithm other than the aforementioned well-known algorithms is being used, then the code must start with the character `X-`. This ensures that as new reserved codes are added, there will never be a conflict with existing implementations.

### API

Please note the following conventions in the API definition:

* Methods have parenthesis such as `method()`
* Attributes never have parenthesis and always include a return type such as `attribute: String`
* Where a method relies on underlying IO, and in some languages may therefore be idiomatic to use a callback style, Promise or Channel etc. the return type appears as `=> io ReturnType` such as `loadFromUrl(url: String) => io Response`. When the method does not rely on IO, it is simply presented with `-> ReturnType` such as `sum(a: Int, b: Int) -> Int`
* The interfaces will typically be defined within a namespace such as `SDSP`, however the way to address this varies immensely between languages so is left to the developer implementing the library to do this in an idiomatic way to avoid naming conflicts
* The constructors are not defined in this specification for the `struct` type as it assumed the caller can construct the `struct` in an idiomatic way for the language
* Where constructors are not defined for the `interface` type, this is mostly intentional as the implementation of that `interface` will be transport, platform or language dependent, and as such should be defined by the developer
* The `Int` type is generally considered to be a 64 bit `Int`, but will in all but very few cases work with a 32 bit `Int`. On 32 bit platforms, it is up to the developer to consider the upper limit of the `serial` attribute
* The `URI` type may not be supported in all platforms. If not, a `String` type is compatible

#### Library API

	struct DataFrame
		uid: String
		serial: Int
		ver: Int
		delta: Object
		alg: String
		data: Object
		dataUri: URI
		historyUri: URI
		checksum: { val: String, type: String }
		meta: Object

	interface Library
		constructor(

		)
		publish

#### History Plug-in API

	interface ObjectStorage:
		store(Object object) => io

	struct ObjectStorageLocation:
		uri: URI | String // URI preferred if supported in the language
		uid: String

#### Object Storage Plug-in API

	interface ObjectStorage:
		store(Object object) => io

	struct ObjectStorageLocation:
		uri: URI | String // URI preferred if supported in the language
		uid: String

### Recommendations and considerations

#### Transport requirements

* Duplicates should be avoided. Whilst a serial numbering system means it is not overly complex to remove duplicates, Transports that ensure there are no duplicates help to maintain the stated goal of "minimal complexity"
* Ordering is important. If messages arrive out of order, the subscriber can attempt to re-order them, but this adds complexity and risk that deltas cannot be applied because it waits indefinitely for an earlier delta. Transports that provide reliable ordering are important in helping to maintain the stated goal of "minimal complexity"
* The Transport should offer a Transport History feature allowing previously published Data Frames to be retrieved. If this is not possible, it is the responsibility of the Publisher or any middleware republishing the Data Frames to provide a `historyUri` attribute to retrieve all Data Frames prior to the recently received one i.e. all Data Frames from serial `0` to the current `serial` less `1`.

#### Transport optimizations

* To improve the portability of each `DataFrame`, it is recommended that a `historyUri` URI attribute is included in each `DataFrame` (this can be appended by the Publisher or potentially by a middleware responsible for publishing) that:
  * Is a URL accessible over the Internet
  * Does not require authentication as the URL itself should be secure (i.e. a cryptographically secure embedded token or GUID)
  * As far as practical is a short URL to reduce the overhead in each frame of including a `historyUri` attribute
  * Returns an array of all recent `DataFrame` objects until `ver` 0
  * When possible, includes the initial published Object instead of a `dataUri` to minimize the number of requests needed for a Subscriber to construct the Object
* The `DataFrame` data structure contains attribute names that could arguably be considered verbose given every frame, when using JSON encoding, includes the entire attribute name values. For example, an empty delta frame may contain the following JSON `{"uid":"UID","serial":1,"ver":1,"delta":"{}","alg":"jp"}`. 22 bytes out of 57 total bytes are used for the attribute names alone (although this is a contrived example). If the frame size is important, we recommend using a Transport that provides efficient encoding for pre-defined data structures such as [Google's ProtoBuf](https://developers.google.com/protocol-buffers/) or [Apache Avro](https://avro.apache.org/)
* The `data` attribute of the `DataFrame` supports any type of Object or language primitives such as a `String` or binary blob. We consider the encoding and decoding of these objects on the transport outside of the scope of this specification as it is assumed the transport itself will provide suitable encoding and decoding mechanisms. For example, if the `data` attribute is a binary object, and the transport uses JSON encoding, then it is expected the publishing client would encode the `DataFrame` using, for example, Base64 encoding, and the subscribing client could detect the encoding and decode the `DataFrame` before providing the `DataFrame` to the SDSP library.

#### Transport History requirements

* The Transport History must guarantee that a request is always up to date with the most recently published Data Frame. For example, if Data Frame with serial `5` is published, any Subscriber receiving that Data Frame must be able to issue a Transport History request immediately and expect to receive serial `5` and lower.

#### Transport History optimizations

*

#### Shortcomings and considerations

* Due to the choice of using an increment-only serial number system for each Data Frame, there is currently no means in the protocol for objects to diverge or fork.
* If two publishers simultaneously publish an update, they will generate conflicting serial numbers. Managing these conflicts due to concurrency issues is outside of the scope of this specification. It is required that the Publisher ensures only one update can be applied concurrently which can easily be achieved with locks or a single thread publishing updates.
* If a Subscriber receives a faulty Data Frame according to the protocol, or is unable to apply a delta, there is no mechanism for it to recover from this situation. Given the goals of this protocol are to be decoupled, we believe that the requirement to trigger a re-sync or re-publish of the entire object is outside of the scope of this protocol specification.
* Encoding and decoding issues are outside of the scope of this specification. It is assumed the Transport is responsible for all encoding and decoding issues and the Library consumes and publishes decoded objects.
* Encryption is not considered in this specification. It is assumed the Transport is responsible for encryption and decryption.

#### Implementation recommendations:

* The Object Storage Location should ideally be accessible freely over the Internet. If security is a concern, the URI could contain a cryptographically secure GUID or embedded token.
* The Object Storage Location and History Service should use a TTL that reasonably exceeds the maximum expected duration between a Data Frame being published and consumed.
* When an Object is stored in the Object Storage Location, one may naturally assume a hash of the underlying binary/object could be used as the UID of that object. This is fraught with problems and should be avoided. Instead we strongly recommend a GUID is assigned which guarantees uniqueness. Assuming for example you have two separate publishes starting with an empty JSON object such as `{}`. If a SHA-256 hash (checksum) is generated using the string representation, the UID would be `44136FA355B3678A1146AD16F7E8649E94FB4FC21FE77E8310C060F61CAAFF8A`. If the two publishers then published the initial Data Frame, both would have serial number 0 and UID `44136FA355B3678A1146AD16F7E8649E94FB4FC21FE77E8310C060F61CAAFF8A`. Yet, if both publishers then modify the object and publish diverging deltas, both new Data Frames would have the serial number 1 and the same UID. Any subscriber consuming both sets of Data Frames would now have conflicting deltas to apply.
* Whilst the protocol supports multiple Objects being published concurrently over the same transport, in many cases this may add unnecessary complexity. For example, if a pub/sub channel is being used to publish updates for multiple different objects, subscribers for one object will have to consume Data Frames for objects they will simply discard. Additionally, it is plausible that users may mistakenly assume only one object exists per pub/sub channel and thus rely on the last received Data Frame to provide insight into the Object associated with a channel. Assuming a Transport History request is then made for the last X Data Frames, where X equates to the `serial`, it is plausible that other Data Frame updates will be returned in that request thus resulting in insufficient Data Frames necessary to construct the Object. All of these issues are surmountable, but for the goal of "minimal complexity", we recommend only publishing one object concurrently on a single Transport.

## Code examples

## Contributing

### Current sponsors

This project is currently sponsored and maintained by [Ably, the realtime data distribution platform](https://www.ably.io). The intention is not for any organization to own this open protocol standard, but instead for it to be jointly developed and maintained by the community and other leaders in the realtime space. The spec and website is hosted in a Github account that does not belong to any commercial organization.

### Getting involved

There are two ways to get involved:

* **As a contributor**: simply raise an issue or submit a pull request. We'll do our best to incorporate your feedback and contributions.
* **As a sponsor**: sponsors are not commercial sponsors, but simply people or organizations wishing to participate and commit to ongoing development and support of this spec. Until we have a more formal inbox, please just [contact the current sponsor Ably](https://www.ably.io/contact) about becoming a sponsor. Everyone who can contribute constructively is welcome.

## Related reading

* [Swarm Replicated Object Notation (RON)](https://github.com/gritzko/ron) - an interesting data serialization format for distributed synchronization. The project is still in its infancy, but could be valuable in time as  an efficient Delta Algorithm
