# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]



## 0.1.9 - 2019-12-28 UTC
### Added
- Lazy prop to enable disabling Waypoint.
- `class`, `placeholderClass`, `wrapperClass` props.
### Changed
- Bumped Waypoint version
- Remove `\n` from srcset [PR](https://github.com/matyunya/svelte-image/pull/38).
- Upgraded Sharp to support Node 13 [issues/37](https://github.com/matyunya/svelte-image/issues/37).


## 0.1.6 - 2019-12-21 UTC
### Added
- Error message when building AST.
- Filtering out node types before processing.


## 0.1.5 - 2019-11-19 UTC
### Fixed
- Bug where inlining on `<img>` failed and caused missing assets.
- Fixed node attributes undefined error. [issues/32](https://github.com/matyunya/svelte-image/issues/32)
### Added
- Catch exception when src is not provided.

## 0.1.4 - 2019-11-1 UTC



## 0.1.3 - 2019-11-1 UTC



## 0.1.2 - 2019-10-30 UTC
### Fixed
- Added main.js to included files.
- Fixed reversed srcset. [issues/28](https://github.com/matyunya/svelte-image/issues/28)
### Changed
- Upgraded svelte.
- Removed smelte from deps.



## 0.1.0 - 2019-10-29 UTC
### Added
- Extension filtering. `<img>` tags would incorrectly try to process files that
  were not processable, such as SVGs. Added an overridable list of file
  extensions for the image tag and Image Component to check against before
  attempting to process.
- Tests! Added a few tests for the extension filtering.
- Performance optimization: preprocessor won't parse file contents if it doesn't
  contain image tags.


## 0.0.14 - 2019-10-22
### Fixed
- Resizing an image that was smaller than any of the given sizes would fail
### Added
- Feature: Option for size of potrace placeholder
- Feature: Image/img src may now start with a "/" (and they all probably should)
- Development: tooling to automate releases
### Changed
- Changelog format update.


## 0.0.13 - 2019-10-06
### Fixed
- Images smaller than smallest size returning null meta

## 0.0.12 - 2019-08-16
### Added
- Feature: Image processing preserves nested folder structure within /static dir
### Fixed
- Images or imgs without src will not crash the server.


## 0.0.11 - 2019-08-16
### Fixed
- Bugfix from previous release.



## 0.0.10 - 2019-08-16
### Added
- Changelog
### Changed
- Improved src checking to allow `<img/>` tags (not `<Image/>` components) to
  use external paths. They will not be processed (as usual), but they also will
  not crash the server.



## 0.0.9 - 2019-08-04
### Fixed
- Safari display bug



## 0.0.8 - 2019-07-17
### Added
- Calculate ratio for images passed through Image component


## 0.0.7 - 2019-07-16
### Fixed
- Styling bug



## 0.0.6 - 2019-07-16
### Changed
- Pass options directly to Sharp's `webp` function through `options.webpOptions`



## 0.0.5 - 2019-07-16



## 0.0.4 - 2019-07-10



## 0.0.3 - 2019-07-9



## 0.0.2 - 2019-07-07



## 0.0.1 - 2019-07-06
