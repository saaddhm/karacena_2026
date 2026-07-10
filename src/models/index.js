
// import Sequelize from 'sequelize';
// const { DataTypes } = Sequelize;

// import { sequelize } from '../config/db.js';

// import { sequelize } from '../config/db.js';

// // ---------- users ----------
// export const User = sequelize.define('user', {
//   id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
//   name: { type: DataTypes.STRING(120), allowNull: false },
//   email: { type: DataTypes.STRING(180), allowNull: false, unique: true, validate: { isEmail: true } },
//   passwordHash: { type: DataTypes.STRING(255), allowNull: false },
//   role: { type: DataTypes.ENUM('admin', 'editor'), defaultValue: 'editor' }
// }, { tableName: 'users' });

// // ---------- venues ----------
// export const Venue = sequelize.define('venue', {
//   id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
//   nameFr: { type: DataTypes.STRING(180), allowNull: false },
//   nameEn: { type: DataTypes.STRING(180), allowNull: false },
//   slug: { type: DataTypes.STRING(180), allowNull: false, unique: true },
//   addressFr: DataTypes.STRING(255),
//   addressEn: DataTypes.STRING(255),
//   descriptionFr: DataTypes.TEXT,
//   descriptionEn: DataTypes.TEXT,
//   latitude: DataTypes.DECIMAL(10, 7),
//   longitude: DataTypes.DECIMAL(10, 7),
//   capacity: DataTypes.INTEGER,
//   accessInfoFr: DataTypes.TEXT,
//   accessInfoEn: DataTypes.TEXT,
//   imageUrl: DataTypes.STRING(500)
// }, { tableName: 'venues' });

// // ---------- artists ----------
// export const Artist = sequelize.define('artist', {
//   id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
//   name: { type: DataTypes.STRING(180), allowNull: false },
//   slug: { type: DataTypes.STRING(180), allowNull: false, unique: true },
//   country: DataTypes.STRING(100),
//   discipline: DataTypes.STRING(180),
//   bioFr: DataTypes.TEXT,
//   bioEn: DataTypes.TEXT,
//   photoUrl: DataTypes.STRING(500),
//   websiteUrl: DataTypes.STRING(500),
//   isCompany: { type: DataTypes.BOOLEAN, defaultValue: false }
// }, { tableName: 'artists' });

// // ---------- shows ----------
// export const Show = sequelize.define('show', {
//   id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
//   titleFr: { type: DataTypes.STRING(255), allowNull: false },
//   titleEn: { type: DataTypes.STRING(255), allowNull: false },
//   slug: { type: DataTypes.STRING(255), allowNull: false, unique: true },
//   category: { type: DataTypes.ENUM('AMESIP', 'LAUREATS', 'INTERNATIONAL'), allowNull: false },
//   summaryFr: DataTypes.TEXT,
//   summaryEn: DataTypes.TEXT,
//   descriptionFr: DataTypes.TEXT('long'),
//   descriptionEn: DataTypes.TEXT('long'),
//   durationMinutes: DataTypes.INTEGER,
//   ageMinimum: DataTypes.INTEGER,
//   posterUrl: DataTypes.STRING(500),
//   teaserVideoUrl: DataTypes.STRING(500),
//   galleryJson: { type: DataTypes.JSON, defaultValue: [] },
//   priceMad: { type: DataTypes.DECIMAL(8, 2), defaultValue: 0 },
//   isFree: { type: DataTypes.BOOLEAN, defaultValue: false },
//   isFeatured: { type: DataTypes.BOOLEAN, defaultValue: false },
//   isPublished: { type: DataTypes.BOOLEAN, defaultValue: true }
// }, { tableName: 'shows' });

// // ---------- show_artists (junction) ----------
// export const ShowArtist = sequelize.define('show_artist', {
//   id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true }
// }, { tableName: 'show_artists' });

// // ---------- show_dates ----------
// export const ShowDate = sequelize.define('show_date', {
//   id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
//   startsAt: { type: DataTypes.DATE, allowNull: false },
//   endsAt: DataTypes.DATE,
//   seatsTotal: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 200 },
//   seatsBooked: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
//   status: { type: DataTypes.ENUM('SCHEDULED', 'SOLD_OUT', 'CANCELLED'), defaultValue: 'SCHEDULED' }
// }, { tableName: 'show_dates' });

// // ---------- bookings ----------
// export const Booking = sequelize.define('booking', {
//   id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
//   reference: { type: DataTypes.STRING(20), allowNull: false, unique: true },
//   customerName: { type: DataTypes.STRING(180), allowNull: false },
//   customerEmail: { type: DataTypes.STRING(180), allowNull: false, validate: { isEmail: true } },
//   customerPhone: DataTypes.STRING(40),
//   type: { type: DataTypes.ENUM('SINGLE', 'PASS'), defaultValue: 'SINGLE' },
//   quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
//   totalMad: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
//   paymentMethod: { type: DataTypes.ENUM('CMI', 'ONSITE'), defaultValue: 'CMI' },
//   paymentStatus: { type: DataTypes.ENUM('PENDING', 'PAID', 'FAILED', 'CANCELLED', 'EXPIRED', 'REFUNDED'), defaultValue: 'PENDING' },
//   paymentRef: DataTypes.STRING(255)
// }, { tableName: 'bookings' });

// // ---------- tickets ----------
// export const Ticket = sequelize.define('ticket', {
//   id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
//   code: { type: DataTypes.STRING(64), allowNull: false, unique: true },   // opaque QR token
//   serial: { type: DataTypes.STRING(40), unique: true },                   // human-readable ref (KRC-XXXX-01)
//   qrDataUrl: DataTypes.TEXT('medium'),
//   holderName: DataTypes.STRING(180),
//   status: { type: DataTypes.ENUM('VALID', 'USED', 'CANCELLED', 'REFUNDED'), defaultValue: 'VALID' },
//   scannedAt: DataTypes.DATE,
//   checkedInBy: DataTypes.STRING(120)
// }, { tableName: 'tickets' });

// // ---------- blog_posts ----------
// export const BlogPost = sequelize.define('blog_post', {
//   id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
//   titleFr: { type: DataTypes.STRING(255), allowNull: false },
//   titleEn: { type: DataTypes.STRING(255), allowNull: false },
//   slug: { type: DataTypes.STRING(255), allowNull: false, unique: true },
//   category: { type: DataTypes.ENUM('NEWS', 'PORTRAIT', 'BACKSTAGE', 'INTERVIEW', 'VIDEO'), defaultValue: 'NEWS' },
//   excerptFr: DataTypes.TEXT,
//   excerptEn: DataTypes.TEXT,
//   bodyFr: DataTypes.TEXT('long'),
//   bodyEn: DataTypes.TEXT('long'),
//   coverUrl: DataTypes.STRING(500),
//   videoUrl: DataTypes.STRING(500),
//   isPublished: { type: DataTypes.BOOLEAN, defaultValue: false },
//   publishedAt: DataTypes.DATE
// }, { tableName: 'blog_posts' });

// // ---------- partners ----------
// export const Partner = sequelize.define('partner', {
//   id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
//   name: { type: DataTypes.STRING(180), allowNull: false },
//   type: { type: DataTypes.ENUM('INSTITUTIONAL', 'SPONSOR', 'MEDIA'), allowNull: false },
//   logoUrl: DataTypes.STRING(500),
//   websiteUrl: DataTypes.STRING(500),
//   descriptionFr: DataTypes.TEXT,
//   descriptionEn: DataTypes.TEXT,
//   displayOrder: { type: DataTypes.INTEGER, defaultValue: 0 },
//   isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
// }, { tableName: 'partners' });

// // ---------- newsletter_subscribers ----------
// export const NewsletterSubscriber = sequelize.define('newsletter_subscriber', {
//   id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
//   email: { type: DataTypes.STRING(180), allowNull: false, unique: true, validate: { isEmail: true } },
//   locale: { type: DataTypes.ENUM('fr', 'en'), defaultValue: 'fr' },
//   isConfirmed: { type: DataTypes.BOOLEAN, defaultValue: true },
//   unsubscribedAt: DataTypes.DATE
// }, { tableName: 'newsletter_subscribers' });

// // ---------- contact_messages ----------
// export const ContactMessage = sequelize.define('contact_message', {
//   id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
//   name: { type: DataTypes.STRING(180), allowNull: false },
//   email: { type: DataTypes.STRING(180), allowNull: false, validate: { isEmail: true } },
//   subject: DataTypes.STRING(255),
//   message: { type: DataTypes.TEXT, allowNull: false },
//   status: { type: DataTypes.ENUM('NEW', 'READ', 'REPLIED'), defaultValue: 'NEW' }
// }, { tableName: 'contact_messages' });

// // ---------- press_accreditations ----------
// export const PressAccreditation = sequelize.define('press_accreditation', {
//   id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
//   fullName: { type: DataTypes.STRING(180), allowNull: false },
//   email: { type: DataTypes.STRING(180), allowNull: false, validate: { isEmail: true } },
//   phone: DataTypes.STRING(40),
//   mediaOutlet: { type: DataTypes.STRING(255), allowNull: false },
//   mediaType: { type: DataTypes.ENUM('PRESS', 'TV', 'RADIO', 'WEB', 'PHOTO', 'OTHER'), defaultValue: 'PRESS' },
//   country: DataTypes.STRING(100),
//   message: DataTypes.TEXT,
//   status: { type: DataTypes.ENUM('PENDING', 'APPROVED', 'REJECTED'), defaultValue: 'PENDING' }
// }, { tableName: 'press_accreditations' });

// // ---------- atabadoul_registrations ----------
// export const AtabadoulRegistration = sequelize.define('atabadoul_registration', {
//   id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
//   fullName: { type: DataTypes.STRING(180), allowNull: false },
//   email: { type: DataTypes.STRING(180), allowNull: false, validate: { isEmail: true } },
//   phone: DataTypes.STRING(40),
//   organization: DataTypes.STRING(255),
//   role: DataTypes.STRING(180),
//   country: DataTypes.STRING(100),
//   interests: DataTypes.TEXT,
//   wantsDirectory: { type: DataTypes.BOOLEAN, defaultValue: false },
//   directoryBio: DataTypes.TEXT,
//   status: { type: DataTypes.ENUM('PENDING', 'CONFIRMED', 'CANCELLED'), defaultValue: 'PENDING' }
// }, { tableName: 'atabadoul_registrations' });

// // ---------- historical_editions ----------
// export const HistoricalEdition = sequelize.define('historical_edition', {
//   id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
//   year: { type: DataTypes.INTEGER, allowNull: false, unique: true },
//   editionNumber: { type: DataTypes.INTEGER, allowNull: false },
//   themeFr: { type: DataTypes.STRING(255), allowNull: false },
//   themeEn: { type: DataTypes.STRING(255), allowNull: false },
//   descriptionFr: DataTypes.TEXT,
//   descriptionEn: DataTypes.TEXT,
//   coverUrl: DataTypes.STRING(500),
//   galleryJson: { type: DataTypes.JSON, defaultValue: [] },
//   videoUrl: DataTypes.STRING(500)
// }, { tableName: 'historical_editions' });

// // ---------- media_files ----------
// export const MediaFile = sequelize.define('media_file', {
//   id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
//   filename: { type: DataTypes.STRING(255), allowNull: false },
//   originalName: DataTypes.STRING(255),
//   mimeType: DataTypes.STRING(120),
//   sizeBytes: DataTypes.INTEGER,
//   url: { type: DataTypes.STRING(500), allowNull: false },
//   altFr: DataTypes.STRING(255),
//   altEn: DataTypes.STRING(255)
// }, { tableName: 'media_files' });

// // ---------- translations (UI strings, dynamic) ----------
// export const Translation = sequelize.define('translation', {
//   id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
//   namespace: { type: DataTypes.STRING(80), defaultValue: 'common' },
//   keyName: { type: DataTypes.STRING(180), allowNull: false },
//   fr: DataTypes.TEXT,
//   en: DataTypes.TEXT
// }, {
//   tableName: 'translations',
//   indexes: [{ unique: true, fields: ['namespace', 'key_name'] }]
// });

// // ---------- associations ----------
// Show.belongsToMany(Artist, { through: ShowArtist });
// Artist.belongsToMany(Show, { through: ShowArtist });

// Show.hasMany(ShowDate, { as: 'showDates', onDelete: 'CASCADE' });
// ShowDate.belongsTo(Show);

// Venue.hasMany(ShowDate);
// ShowDate.belongsTo(Venue);

// ShowDate.hasMany(Booking);
// Booking.belongsTo(ShowDate, { as: 'showDate', foreignKey: 'showDateId' });

// Booking.hasMany(Ticket, { onDelete: 'CASCADE' });
// Ticket.belongsTo(Booking);

// User.hasMany(BlogPost, { foreignKey: 'authorId' });
// BlogPost.belongsTo(User, { as: 'author', foreignKey: 'authorId' });

// export { sequelize };
import Sequelize from 'sequelize';
const { DataTypes } = Sequelize;

import { sequelize } from '../config/db.js';

// ---------- users ----------
export const User = sequelize.define('user', {
  id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(120), allowNull: false },
  email: { type: DataTypes.STRING(180), allowNull: false, unique: true, validate: { isEmail: true } },
  passwordHash: { type: DataTypes.STRING(255), allowNull: false },
  role: { type: DataTypes.ENUM('admin', 'editor'), defaultValue: 'editor' }
}, { tableName: 'users' });

// ---------- venues ----------
export const Venue = sequelize.define('venue', {
  id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
  nameFr: { type: DataTypes.STRING(180), allowNull: false },
  nameEn: { type: DataTypes.STRING(180), allowNull: false },
  slug: { type: DataTypes.STRING(180), allowNull: false, unique: true },
  addressFr: DataTypes.STRING(255),
  addressEn: DataTypes.STRING(255),
  descriptionFr: DataTypes.TEXT,
  descriptionEn: DataTypes.TEXT,
  latitude: DataTypes.DECIMAL(10, 7),
  longitude: DataTypes.DECIMAL(10, 7),
  capacity: DataTypes.INTEGER,
  accessInfoFr: DataTypes.TEXT,
  accessInfoEn: DataTypes.TEXT,
  imageUrl: DataTypes.STRING(500)
}, { tableName: 'venues' });

// ---------- artists ----------
export const Artist = sequelize.define('artist', {
  id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(180), allowNull: false },
  slug: { type: DataTypes.STRING(180), allowNull: false, unique: true },
  country: DataTypes.STRING(100),
  discipline: DataTypes.STRING(180),
  bioFr: DataTypes.TEXT,
  bioEn: DataTypes.TEXT,
  photoUrl: DataTypes.STRING(500),
  websiteUrl: DataTypes.STRING(500),
  isCompany: { type: DataTypes.BOOLEAN, defaultValue: false }
}, { tableName: 'artists' });

// ---------- shows ----------
export const Show = sequelize.define('show', {
  id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
  titleFr: { type: DataTypes.STRING(255), allowNull: false },
  titleEn: { type: DataTypes.STRING(255), allowNull: false },
  slug: { type: DataTypes.STRING(255), allowNull: false, unique: true },
  category: { type: DataTypes.ENUM('AMESIP', 'LAUREATS', 'INTERNATIONAL'), allowNull: false },
  summaryFr: DataTypes.TEXT,
  summaryEn: DataTypes.TEXT,
  descriptionFr: DataTypes.TEXT('long'),
  descriptionEn: DataTypes.TEXT('long'),
  durationMinutes: DataTypes.INTEGER,
  ageMinimum: DataTypes.INTEGER,
  posterUrl: DataTypes.STRING(500),
  teaserVideoUrl: DataTypes.STRING(500),
  galleryJson: { type: DataTypes.JSON, defaultValue: [] },
  priceMad: { type: DataTypes.DECIMAL(8, 2), defaultValue: 0 },
  isFree: { type: DataTypes.BOOLEAN, defaultValue: false },
  isFeatured: { type: DataTypes.BOOLEAN, defaultValue: false },
  isPublished: { type: DataTypes.BOOLEAN, defaultValue: true }
}, { tableName: 'shows' });

// ---------- show_artists (junction) ----------
export const ShowArtist = sequelize.define('show_artist', {
  id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true }
}, { tableName: 'show_artists' });

// ---------- show_dates ----------
export const ShowDate = sequelize.define('show_date', {
  id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
  startsAt: { type: DataTypes.DATE, allowNull: false },
  endsAt: DataTypes.DATE,
  seatsTotal: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 200 },
  seatsBooked: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  status: { type: DataTypes.ENUM('SCHEDULED', 'SOLD_OUT', 'CANCELLED'), defaultValue: 'SCHEDULED' }
}, { tableName: 'show_dates' });

// ---------- bookings ----------
export const Booking = sequelize.define('booking', {
  id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
  reference: { type: DataTypes.STRING(20), allowNull: false, unique: true },
  customerName: { type: DataTypes.STRING(180), allowNull: false },
  customerEmail: { type: DataTypes.STRING(180), allowNull: false, validate: { isEmail: true } },
  customerPhone: DataTypes.STRING(40),
  type: { type: DataTypes.ENUM('SINGLE', 'PASS'), defaultValue: 'SINGLE' },
  quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  totalMad: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
  paymentMethod: { type: DataTypes.ENUM('CMI', 'ONSITE'), defaultValue: 'CMI' },
  paymentStatus: { type: DataTypes.ENUM('PENDING', 'PAID', 'FAILED', 'CANCELLED', 'EXPIRED', 'REFUNDED'), defaultValue: 'PENDING' },
  paymentRef: DataTypes.STRING(255)
}, { tableName: 'bookings' });

// ---------- tickets ----------
export const Ticket = sequelize.define('ticket', {
  id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
  code: { type: DataTypes.STRING(64), allowNull: false, unique: true },   // opaque QR token
  serial: { type: DataTypes.STRING(40), unique: true },                   // human-readable ref (KRC-XXXX-01)
  qrDataUrl: DataTypes.TEXT('medium'),
  holderName: DataTypes.STRING(180),
  status: { type: DataTypes.ENUM('VALID', 'USED', 'CANCELLED', 'REFUNDED'), defaultValue: 'VALID' },
  scannedAt: DataTypes.DATE,
  checkedInBy: DataTypes.STRING(120)
}, { tableName: 'tickets' });

// ---------- blog_posts ----------
export const BlogPost = sequelize.define('blog_post', {
  id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
  titleFr: { type: DataTypes.STRING(255), allowNull: false },
  titleEn: { type: DataTypes.STRING(255), allowNull: false },
  slug: { type: DataTypes.STRING(255), allowNull: false, unique: true },
  category: { type: DataTypes.ENUM('NEWS', 'PORTRAIT', 'BACKSTAGE', 'INTERVIEW', 'VIDEO'), defaultValue: 'NEWS' },
  excerptFr: DataTypes.TEXT,
  excerptEn: DataTypes.TEXT,
  bodyFr: DataTypes.TEXT('long'),
  bodyEn: DataTypes.TEXT('long'),
  coverUrl: DataTypes.STRING(500),
  videoUrl: DataTypes.STRING(500),
  isPublished: { type: DataTypes.BOOLEAN, defaultValue: false },
  publishedAt: DataTypes.DATE
}, { tableName: 'blog_posts' });

// ---------- partners ----------
export const Partner = sequelize.define('partner', {
  id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(180), allowNull: false },
  type: { type: DataTypes.ENUM('INSTITUTIONAL', 'SPONSOR', 'MEDIA'), allowNull: false },
  logoUrl: DataTypes.STRING(500),
  websiteUrl: DataTypes.STRING(500),
  descriptionFr: DataTypes.TEXT,
  descriptionEn: DataTypes.TEXT,
  displayOrder: { type: DataTypes.INTEGER, defaultValue: 0 },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
}, { tableName: 'partners' });

// ---------- newsletter_subscribers ----------
export const NewsletterSubscriber = sequelize.define('newsletter_subscriber', {
  id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
  email: { type: DataTypes.STRING(180), allowNull: false, unique: true, validate: { isEmail: true } },
  locale: { type: DataTypes.ENUM('fr', 'en'), defaultValue: 'fr' },
  isConfirmed: { type: DataTypes.BOOLEAN, defaultValue: true },
  unsubscribedAt: DataTypes.DATE
}, { tableName: 'newsletter_subscribers' });

// ---------- contact_messages ----------
export const ContactMessage = sequelize.define('contact_message', {
  id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(180), allowNull: false },
  email: { type: DataTypes.STRING(180), allowNull: false, validate: { isEmail: true } },
  subject: DataTypes.STRING(255),
  message: { type: DataTypes.TEXT, allowNull: false },
  status: { type: DataTypes.ENUM('NEW', 'READ', 'REPLIED'), defaultValue: 'NEW' }
}, { tableName: 'contact_messages' });

// ---------- press_accreditations ----------
export const PressAccreditation = sequelize.define('press_accreditation', {
  id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
  fullName: { type: DataTypes.STRING(180), allowNull: false },
  email: { type: DataTypes.STRING(180), allowNull: false, validate: { isEmail: true } },
  phone: DataTypes.STRING(40),
  mediaOutlet: { type: DataTypes.STRING(255), allowNull: false },
  mediaType: { type: DataTypes.ENUM('PRESS', 'TV', 'RADIO', 'WEB', 'PHOTO', 'OTHER'), defaultValue: 'PRESS' },
  country: DataTypes.STRING(100),
  message: DataTypes.TEXT,
  status: { type: DataTypes.ENUM('PENDING', 'APPROVED', 'REJECTED'), defaultValue: 'PENDING' }
}, { tableName: 'press_accreditations' });

// ---------- atabadoul_registrations ----------
export const AtabadoulRegistration = sequelize.define('atabadoul_registration', {
  id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
  fullName: { type: DataTypes.STRING(180), allowNull: false },
  email: { type: DataTypes.STRING(180), allowNull: false, validate: { isEmail: true } },
  phone: DataTypes.STRING(40),
  organization: DataTypes.STRING(255),
  role: DataTypes.STRING(180),
  country: DataTypes.STRING(100),
  interests: DataTypes.TEXT,
  wantsDirectory: { type: DataTypes.BOOLEAN, defaultValue: false },
  directoryBio: DataTypes.TEXT,
  status: { type: DataTypes.ENUM('PENDING', 'CONFIRMED', 'CANCELLED'), defaultValue: 'PENDING' }
}, { tableName: 'atabadoul_registrations' });

// ---------- historical_editions ----------
export const HistoricalEdition = sequelize.define('historical_edition', {
  id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
  year: { type: DataTypes.INTEGER, allowNull: false, unique: true },
  editionNumber: { type: DataTypes.INTEGER, allowNull: false },
  themeFr: { type: DataTypes.STRING(255), allowNull: false },
  themeEn: { type: DataTypes.STRING(255), allowNull: false },
  descriptionFr: DataTypes.TEXT,
  descriptionEn: DataTypes.TEXT,
  coverUrl: DataTypes.STRING(500),
  galleryJson: { type: DataTypes.JSON, defaultValue: [] },
  videoUrl: DataTypes.STRING(500)
}, { tableName: 'historical_editions' });

// ---------- media_files ----------
export const MediaFile = sequelize.define('media_file', {
  id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
  filename: { type: DataTypes.STRING(255), allowNull: false },
  originalName: DataTypes.STRING(255),
  mimeType: DataTypes.STRING(120),
  sizeBytes: DataTypes.INTEGER,
  url: { type: DataTypes.STRING(500), allowNull: false },
  altFr: DataTypes.STRING(255),
  altEn: DataTypes.STRING(255)
}, { tableName: 'media_files' });

// ---------- translations (UI strings, dynamic) ----------
export const Translation = sequelize.define('translation', {
  id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
  namespace: { type: DataTypes.STRING(80), defaultValue: 'common' },
  keyName: { type: DataTypes.STRING(180), allowNull: false },
  fr: DataTypes.TEXT,
  en: DataTypes.TEXT
}, {
  tableName: 'translations',
  indexes: [{ unique: true, fields: ['namespace', 'key_name'] }]
});

// ---------- associations ----------
Show.belongsToMany(Artist, { through: ShowArtist });
Artist.belongsToMany(Show, { through: ShowArtist });

Show.hasMany(ShowDate, { as: 'showDates', onDelete: 'CASCADE' });
ShowDate.belongsTo(Show);

Venue.hasMany(ShowDate);
ShowDate.belongsTo(Venue);

ShowDate.hasMany(Booking);
Booking.belongsTo(ShowDate, { as: 'showDate', foreignKey: 'showDateId' });

Booking.hasMany(Ticket, { onDelete: 'CASCADE' });
Ticket.belongsTo(Booking);

User.hasMany(BlogPost, { foreignKey: 'authorId' });
BlogPost.belongsTo(User, { as: 'author', foreignKey: 'authorId' });

export { sequelize };