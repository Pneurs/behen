# Behen Style Hub

BEHEN.PK 2.0 – FULL APP REQUIREMENTS”

You are my professional project manager, product architect, UI/UX designer, database engineer, and AI prompt engineer.
Build my complete Behen.pk 2.0 rental + resale marketplace app, with map-based search, availability calendar, secure chat, AI image generation, admin dashboard, and full Web + Mobile support.

📌 1. App Overview

Build Behen.pk 2.0, a rental + resale marketplace for bridal and formal wear.
Two roles:

Bari Behen = Seller / Renter

Choti Behen = Buyer / Renter

The app must support:
✔ AI-generated cover images
✔ Private real images in chat
✔ Hidden exact location
✔ Map-based approximate location
✔ Distance sorting
✔ Availability calendar
✔ In-app chat blocking phone numbers
✔ Unlock address + number only after booking
✔ Booking + payment workflow
✔ Admin dashboard
✔ SEO landing pages
✔ User analytics
✔ Web + mobile version

📌 2. Core Features (High Priority)
A. AI-generated cover image (first image)

Bari Behen uploads real dress images privately

App generates ONE AI cover image using OpenAI or Stability API

This AI image appears publicly on listing

Real images appear only in private chat after booking confirmation

Protects user privacy and avoids Google Image search issues

B. Listing Fields for Bari Behen

Create a complete product form with:

Basic Details

Title

Category (Bridal, Barat, Walima, Formal, Party Wear)

Subcategory

Condition (New, Like New, Used Twice, Used Often)

For Rent / For Sale / Both

Price per day (rent)

Full price (resale)

Security deposit

Description

Fabric

Color

Work type (handwork, machine, embroidery, etc.)

Original designer/brand (optional)

Size & Fit

Size (S/M/L/XL/Custom)

Height required

Weight range

Chest size

Waist size

Hips size

Alteration possible? Yes/No

Rental History

Last rented on (date)

Number of times rented

Location

Approximate location (area only)

Exact location (hidden until booking)

GPS coordinates stored but not shown publicly

Availability Calendar

Select available dates

Mark blackout dates

Auto-check availability during booking

Images

Upload real images (hidden)

Generate AI cover image (public)

C. Choti Behen Features

Map view + List view

Filter by category, size, price, location

Distance sorting (“Near Me”)

Approximate location only

Real images only after chat

Booking request

Unlock real images + exact address after payment/confirmation

Chat inside app

Chat moderation: block phone numbers, emails, streets, house numbers

Rating & review system

D. Secure Chat System

Before booking:

Block sending digits like "0300", "+92", “house”, “street”, “block”, “sector”

Allow only product discussion

After booking:

Unlock full chats

Allow phone number

Allow exact address

Unlock real images

E. Map Integration

Use Google Maps API

Show approximate location (blur red pin 300m to 700m radius)

Show distance from user

Directions available only after booking confirmation

F. Admin Panel (Web Only)

Super-admin features:

Dashboard

Total users

Total listings

Total active rentals

Daily/weekly/monthly stats

Revenue chart

Popular categories

Event statistics

User Management

Ban/unban users

Reset password

Verify identity (optional)

Product Management

Approve/Reject listings

See real images (admin only)

Edit categories

Edit products

Delete products

Chat Moderation

Review flagged messages

Block abusive users

Booking Management

Track status

Resolve disputes

Analytics

Daily visitors

Heatmap of cities

Category performance

User retention

📌 3. Database Structure

Build collections like:

Users

Role (Bari/Choti)

Name

Phone

Email

Location (approx + exact)

Profile image

Stats

Products

OwnerID

Title

Category

Size

Price

Condition

AI image

Real images (private)

Availability calendar

Approx location

Exact location (hidden)

GPS coords

Created at

Bookings

ProductID

RenterID

Dates selected

Status

Payment info

Unlock flags

Chat

Message

Sender

Receiver

Timestamp

Blocked content flag

Admin

Settings

Logs

Moderations

📌 4. UX/UI Requirements

Use a clean feminine design:

Light pink + white + gold accents

Soft rounded corners

Card-based layout

Modern minimal UI like Airbnb + Etsy

Floating map button

Clear filters

Create screens for:

Onboarding

Login

Home

Search

Map view

Filters

Product page

Booking calendar

Checkout

Chat

Profile

Upload new dress (multi-step)

Admin panel

📌 5. SEO Landing Pages (for web app)

Automatically generate pages like:

Bridal lehnga for rent in Lahore

Barat dress near DHA Karachi

Mehndi dress for rent in Multan

Party wear near Johar Town Lahore

These pages help rank on Google.

📌 6. Build the complete app with Web + Android + iOS support

Use responsive UI and include map + chat + calendar.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://behen.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/556a8fb3-b6db-4f1b-a121-fa65ae145135).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
