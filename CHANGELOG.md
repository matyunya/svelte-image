# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]
### Fixed
- Resizing an image that was smaller than any of the given sizes would fail
### Added
- Feature: Image/img src may now start with a "/" (and they all probably should)
- Development: tooling to automate releases
### Changed
- Changelog format update.



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
