# My Grocery App — Development Specification

## 1. Project Overview

Build a mobile-first personal grocery and household product management application.

The purpose of the application is to maintain a permanent, categorized collection of products that the user regularly purchases.

The user manually adds products whenever they buy something. Over time, the application becomes a personal product catalogue that can be used as a reference when going shopping.

The application is NOT a traditional inventory management system. It does not track stock levels, product quantities, expiration dates or current household inventory.

The primary goal is to help the user remember which products they usually buy.

### Main requirements

- Mobile-first application.
- Serbian language throughout the interface.
- Single personal user account with authentication.
- Persistent database storage.
- Customizable categories and subcategories.
- Manual product management.
- Simple shopping checklist.
- Clean, modern and intuitive UI.

## 2. Technology Stack

Use the following technologies:

- Frontend: Angular.
- Language: TypeScript.
- Architecture: Angular standalone components.
- Styling: SCSS.
- Database: Supabase PostgreSQL.
- Authentication: Supabase Auth.
- Backend integration: Supabase client.
- Application type: Progressive Web App (PWA).

Use modern Angular practices, including:
- Standalone components.
- Signals where appropriate for local and shared reactive state.
- Angular services for business logic and data access.
- Reactive Forms for data entry and validation.
- Lazy loading where appropriate.
- Strict TypeScript configuration.

Do not introduce unnecessary libraries or architectural complexity.

## 3. Application Navigation

Use a mobile bottom navigation bar with six sections:

1. Početna
2. Kategorije
3. Proizvodi
4. Kupovina
5. Finansije
6. Profil

The navigation should remain accessible throughout the application after authentication.

### 3.1 Početna (Dashboard)

Display an overview of the user's collection.

Include:
- Total number of saved products.
- Total number of categories.
- Recently added products.
- Quick action to add a product.
- Quick access to shopping mode.

Keep the dashboard simple and functional.

### 3.2 Kategorije (Categories)

Display all main categories.

Each category should display:
- Category name.
- Number of products.
- Subcategories, if available.

Users should be able to:
- Create categories.
- Edit category names.
- Delete categories.
- Create subcategories.
- Edit subcategories.
- Delete subcategories.
- Open a category to see its products.

Categories and subcategories must be completely customizable.

Example category structure:

Hrana
- Mlečni proizvodi
- Meso
- Voće
- Povrće
- Pića
- Peciva
- Ostalo

Kućna hemija
- Pranje veša
- Čišćenje
- Pranje sudova

Lična higijena
- Nega tela
- Nega kose
- Oralna higijena

Ostalo

These are suggested initial categories, not mandatory restrictions.

### 3.3 Proizvodi (Products)

This section contains the user's complete personal product collection.

Display products grouped by their categories.

Users should be able to:
- Browse products by category.
- Expand and collapse category sections.
- Search products by name.
- Open product details.
- Add products.
- Edit products.
- Delete products.

Every product must belong to one main category.

A subcategory is optional.

#### Product data model

Each product should contain:

- id: UUID.
- user_id: UUID.
- name: string (required).
- category_id: UUID (required).
- subcategory_id: UUID (optional).
- created_at: timestamp.
- updated_at: timestamp.

Do not introduce quantity, measurement units, stock levels or price tracking.

#### Adding a product

The product creation form should contain:

- Naziv proizvoda (required).
- Kategorija (required).
- Potkategorija (optional).

The category selector should display the user's existing categories.

The subcategory selector should dynamically update based on the selected category.

After successful creation:
- Save the product to Supabase.
- Update the product collection.
- Display a success notification.
- Close the form or navigate back to the product list.

Prevent duplicate submissions and validate required fields.

### 3.4 Kupovina (Shopping)

This is an important feature of the application.

Shopping mode should allow the user to create a simple shopping checklist using products from their permanent collection.

Required functionality:

- Browse the permanent product collection by category.
- Select products to add to the shopping checklist.
- Display all selected products in one checklist.
- Mark products as purchased using checkboxes.
- Uncheck products if necessary.
- Remove individual products from the checklist.
- Clear the entire checklist when finished.

Important business rules:

1. Selecting a product for shopping must not create another product record.
2. Checking a product as purchased must not delete it from the permanent collection.
3. The shopping checklist must be independent of the permanent product collection.
4. Clearing the shopping checklist must not affect saved products.
5. A product can only appear once in the same shopping checklist.

For the MVP, implement one active shopping checklist.

Do not implement shopping trip history, price tracking, purchase frequency or automatic shopping recommendations.

### 3.5 Profil (Profile)

Include:
- Display user information.
- Sign out.
- Basic account settings.

Keep this section minimal.

### 3.6 Finansije (Finance)

Provide a separate personal-finance section. Finance categories must be independent of grocery product categories.

Required functionality:
- Record expenses with an amount, category and date, in RSD.
- Record income as either Plata or Ostali prihod. Plata starts a new salary period; Ostali prihod increases the balance without starting a period.
- Carry the previous period's remaining balance into the next salary period.
- Show salary-to-salary, calendar-month and custom-date-range summaries.
- Visualize expenses by category and show transaction history.
- Allow users to add and remove finance categories with icons.
- Allow transactions to be edited and deleted.

Do not add payment methods or transaction notes in the initial version.

## 4. Authentication

Use Supabase Auth.

The application is intended for one personal user, with a private account.

Requirements:
- Login screen.
- Email/password authentication.
- Persistent authenticated session.
- Logout functionality.
- Protected application routes.
- Redirect unauthenticated users to login.
- Appropriate authentication error messages in Serbian.

Do not implement public registration or multi-user collaboration features in the MVP.

The application must still use user ownership on database records and Row Level Security policies.

## 5. Database Architecture

Use Supabase PostgreSQL.

Create the following tables:

### profiles

- id (UUID, references auth.users).
- email.
- created_at.

### categories

- id (UUID).
- user_id (UUID).
- name (string).
- created_at.
- updated_at.

### subcategories

- id (UUID).
- user_id (UUID).
- category_id (UUID).
- name (string).
- created_at.
- updated_at.

### products

Use the product data model defined in section 3.3.

### shopping_list_items

- id (UUID).
- user_id (UUID).
- product_id (UUID).
- is_purchased (boolean, default false).
- created_at.

### finance_categories

- id (UUID).
- user_id (UUID).
- name (string).
- icon (string).
- is_active (boolean, default true).
- created_at.

Archived categories must remain available to historical transactions.

### finance_transactions

- id (UUID).
- user_id (UUID).
- type (expense, salary or other_income).
- amount (positive numeric amount in RSD).
- category_id (required for expenses, null for income).
- transaction_date (date).
- created_at.

Salary transactions define pay-period start dates. The balance is derived from all income and expense transactions so previous savings carry forward.

Use appropriate foreign keys, indexes and constraints.

A product must belong to a valid category.

A subcategory, when specified, must belong to the selected category.

Prevent duplicate product selections in the active shopping checklist.

Implement Row Level Security for all user-owned tables.

Users must only be able to access and modify their own data.

Use database migrations to create and modify the database schema.

Do not expose the Supabase service-role key in frontend code.

## 6. UI/UX Design Requirements

The application should feel like a polished modern mobile application.

Design principles:

- Mobile-first approach.
- Clean and minimal interface.
- Intuitive navigation.
- Consistent spacing and typography.
- Clear visual hierarchy.
- Rounded cards and buttons.
- Comfortable touch targets.
- Consistent icons.
- Subtle animations and transitions.
- Responsive layouts.

Use a consistent design system with reusable colors, spacing, typography and component styles.

The design should be functional rather than overly decorative.

Avoid excessive gradients, unnecessary animations and complicated layouts.

All visible application text must be in Serbian.

Use natural Serbian terminology and proper characters (č, ć, š, ž, đ).

## 7. Application States and Error Handling

Implement appropriate states for every data-driven screen.

Include:

- Loading indicators.
- Empty states.
- Error states.
- Success notifications.
- Form validation messages.
- Confirmation dialogs for destructive operations.

Examples:

Empty product collection:
"Još uvek nemaš dodatih proizvoda."

Empty shopping checklist:
"Tvoja lista za kupovinu je prazna."

Successful product creation:
"Proizvod je uspešno dodat."

Deletion confirmation:
"Da li sigurno želiš da obrišeš ovaj proizvod?"

Handle Supabase errors gracefully and display understandable Serbian messages.

Do not expose raw technical errors to the user.

## 8. Code Quality and Architecture

Organize the project into logical feature-based modules/directories.

Suggested structure:

src/app/
- core/
  - services/
  - guards/
  - interceptors/
- shared/
  - components/
  - models/
  - pipes/
- features/
  - auth/
  - dashboard/
  - categories/
  - products/
  - shopping/
  - finance/
  - profile/
- layout/
  - bottom-navigation/
  - main-layout/

Use:
- Reusable UI components.
- Dedicated services for Supabase communication.
- Typed interfaces and models.
- Separation of presentation and business logic.
- Consistent naming conventions.
- Strict TypeScript.
- Meaningful error handling.

Avoid:
- Large components containing all application logic.
- Duplicated code.
- Unnecessary abstractions.
- Excessive dependencies.
- Hardcoded application data.
- Using localStorage as the primary database.

## 9. PWA and Offline Considerations

Prepare the application as an installable PWA.

The application should have:
- Web app manifest.
- Appropriate application icons.
- Service worker configuration.
- Mobile-friendly viewport and layouts.

Do not implement complex offline data synchronization in the initial MVP.

Online functionality and reliable database persistence take priority.

## 10. Security

- Keep Supabase credentials in environment configuration.
- Never expose service-role credentials.
- Use Row Level Security.
- Validate user input.
- Protect authenticated routes.
- Ensure all database operations respect user ownership.
- Do not trust frontend-only authorization checks.

## 11. Out of Scope for MVP

Do not implement the following features in the first version:

- Product stock management.
- Product quantities or measurement units.
- Expiration dates.
- Barcode scanning.
- Product images.
- Price tracking.
- Purchase frequency analytics.
- Shopping history.
- Multiple shopping lists.
- Multi-user collaboration.
- Product recommendations.
- AI features.
- Hosting or deployment configuration.

These features may be considered in future versions.

## 12. Implementation Strategy

Implement the application incrementally.

Do not attempt to generate the entire application in one step.

### Phase 1: Project foundation
- Initialize Angular project.
- Configure SCSS and routing.
- Establish project structure.
- Configure Supabase client.
- Establish design system.
- Create main application layout and navigation.

### Phase 2: Authentication and database
- Implement login.
- Configure Supabase authentication.
- Create database migrations.
- Implement RLS policies.
- Implement protected routes.

### Phase 3: Categories
- Implement category CRUD.
- Implement subcategory CRUD.
- Implement category validation.
- Connect everything to Supabase.

### Phase 4: Products
- Implement product CRUD.
- Implement product creation and editing forms.
- Implement category and subcategory selection.
- Implement product search.
- Implement category-based product browsing.

### Phase 5: Shopping
- Implement the active shopping checklist.
- Implement product selection.
- Implement purchased/unpurchased states.
- Implement individual removal and clearing the list.

### Phase 6: Dashboard and polish
- Implement dashboard statistics.
- Implement recently added products.
- Add loading, empty and error states.
- Refine responsive layouts.
- Test all application workflows.

## 13. Acceptance Criteria

The MVP is considered complete when:

1. The user can log in securely.
2. The user can create, edit and delete categories.
3. The user can create, edit and delete subcategories.
4. The user can manually add products.
5. Products remain saved after closing and reopening the application.
6. Products are displayed under their respective categories.
7. The user can search for saved products.
8. The user can select products for shopping.
9. The user can mark shopping items as purchased.
10. The user can clear the shopping checklist without deleting permanent products.
11. All data is persisted in Supabase.
12. All user-owned data is protected by RLS.
13. The interface works well on mobile devices.
14. All user-facing text is in Serbian.

---

## 14. Instructions to GitHub Copilot

Treat this document as the single source of truth for the application requirements.

Before implementing anything:

1. Analyze the existing repository.
2. Inspect the installed Angular version and existing dependencies.
3. Propose the implementation architecture.
4. Identify required packages.
5. Explain the database schema and required Supabase configuration.
6. Identify any missing credentials or configuration that must be supplied by the developer.

Then implement the application according to the phases described above.

Important development rules:

- Do not skip phases.
- Do not silently change the agreed requirements.
- Do not introduce features that are explicitly out of scope.
- Do not use mock data as a substitute for actual database integration in the completed features.
- Do not assume Supabase credentials are available.
- If a required configuration is missing, explain exactly what needs to be provided.
- Do not overwrite existing project files without inspecting them first.
- Keep the application runnable after each implementation phase.
- Test the implemented functionality before moving to the next phase.
- Update documentation when architecture or setup changes.

When a design or technical decision is not explicitly specified, choose the simplest maintainable solution consistent with this specification.

Prioritize a working, reliable and polished MVP over unnecessary complexity.