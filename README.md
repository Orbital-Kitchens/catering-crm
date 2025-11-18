# Orbital Catering CRM

A comprehensive Customer Relationship Management system for Orbital Catering, built with modern web technologies and integrated with Google Sheets for real-time data management.

## Features

### 📊 Multi-Tab Dashboard
- **Today's Orders**: Real-time view of current day orders with filtering and search
- **All Orders**: Complete order history with advanced filtering by date, platform, and customer tier
- **Analytics**: Interactive charts and top customer insights with customizable date ranges
- **Sales Pipeline**: Tier-based customer segmentation with follow-up tracking and conversion metrics
- **Churn Analysis**: Customer retention monitoring with risk segmentation and platform switching detection
- **Delivery Map**: Interactive Google Maps integration showing order locations and pickup points

### 🎯 Customer Intelligence
- **Automated Tier Scoring**: Algorithm-based customer classification (Tier 1/2/3) using:
  - Order frequency and volume
  - Average headcount
  - Brand diversity
  - Platform usage patterns
- **Customer Interactions**: Persistent note-taking and follow-up tracking stored in Google Sheets
- **Sales Status Tracking**: Prospect → Contacted → Converting → Converted pipeline management
- **Follow-up Management**: Overdue, today, and weekly follow-up queues

### 🔍 Advanced Filtering & Search
- Platform-based filtering across all views
- Date range selections with quick presets
- Tier-based customer filtering
- Real-time search across companies and contacts
- Status-based pipeline filtering

### 🗺️ Geographic Intelligence
- Interactive delivery map with order clustering
- Pickup vs delivery location differentiation
- Tier-based marker styling (gold for Tier 1 customers)
- Detailed order information in map popups
- Date range filtering for map visualization

### 📉 Churn Analysis & Retention Insights
- **Risk-Based Segmentation**: Automatic customer classification into risk categories:
  - **Critical**: 60+ days since last order (high churn risk)
  - **At-Risk**: 30-59 days since last order (moderate risk)
  - **Watching**: 15+ days for frequent customers (average order frequency ≤21 days)
  - **Lost**: 180+ days without orders (excluded from active monitoring)
- **Platform Switching Detection**: Identifies customers who moved from Flex Catering to competitors
  - Tracks Flex-to-competitor transitions within 60-day windows
  - Shows switch timing, platform destination, and order frequency
  - Highlights high-value customers (Tier 1/2) who switched platforms
- **Advanced Filtering**: Multi-dimensional filtering by risk status, tier, and last contact date
- **Contact Tracking Integration**: View days since last customer interaction alongside churn status
- **Paginated Results**: Handles large customer datasets with 50 items per page

## 🏗️ Technical Architecture

### Frontend Structure
```
├── index.html              # Main application shell
├── styles.css             # Unified styling system
└── js/
    ├── config.js          # Configuration and global variables
    ├── data-processing.js # Google Sheets integration and data transformation
    ├── ui-components.js   # Shared UI utilities and helper functions
    ├── interactions.js    # Customer interaction management
    ├── main.js           # Application controller and initialization
    └── tabs/
        ├── todays-orders.js    # Today's orders functionality
        ├── order-history.js    # Historical order management
        ├── analytics.js        # Charts and analytics dashboard
        ├── sales-pipeline.js   # Customer relationship management
        ├── churn-analysis.js   # Customer retention and churn monitoring
        └── map.js             # Geographic visualization
```

### Data Sources
- **Primary Orders**: Google Sheets API (read-only)
- **Customer Interactions**: Google Apps Script + Google Sheets (read/write)
- **Customer Tiers**: Real-time algorithmic calculation
- **Maps Data**: Google Maps JavaScript API with geocoding

### Key Technologies
- **Frontend**: Vanilla JavaScript (ES6+), Chart.js, Google Maps API
- **Data Storage**: Google Sheets with Apps Script proxy for writes
- **Styling**: Custom CSS with modern gradients and animations
- **Hosting**: GitHub Pages with automated deployment

## 📈 Customer Tier Algorithm

The system automatically calculates customer tiers based on a 100-point scoring system:

### Scoring Breakdown
- **Order Frequency (40 pts max)**
  - 5+ orders: 40 points
  - 3-4 orders: 25 points
  - 2 orders: 15 points
  - 1 order: 5 points

- **Average Headcount (30 pts max)**
  - 50+ guests: 30 points
  - 30-49 guests: 20 points
  - 20-29 guests: 15 points
  - 10-19 guests: 10 points
  - <10 guests: 5 points

- **Brand Diversity (30 pts max)**
  - 3+ brands: 30 points
  - 2 brands: 20 points
  - 1 brand: 10 points

### Tier Classifications
- **🥇 Tier 1**: 70+ points (High-value prospects)
- **🥈 Tier 2**: 45-69 points (Medium potential)
- **🥉 Tier 3**: <45 points (Standard customers)

## 📊 Churn Analysis Algorithm

The system automatically monitors customer engagement and identifies retention risks using time-based behavior analysis:

### Churn Status Classification

Customers require **at least 2 orders** to be evaluated for churn risk. Single-order customers are excluded from churn monitoring.

**Status Definitions:**
- **Active**: Ordered within last 15 days, or longer gaps for infrequent customers
- **Watching**: 15+ days since last order for frequent customers (avg. frequency ≤21 days)
- **At-Risk**: 30-59 days since last order
- **Critical**: 60-179 days since last order (high churn probability)
- **Lost**: 180+ days without orders (excluded from active churn metrics)

### Platform Switching Detection Logic

The system identifies customers who transition from Flex Catering to competitor platforms:

**Detection Criteria:**
1. Customer ordered from Flex Catering
2. Next order placed on a non-Direct platform (competitor)
3. Transition occurred within 60-day window
4. Tracks most recent switch per customer

**Key Metrics Tracked:**
- Total Flex Catering order count
- Total competitor platform order count
- Days between last Flex order and competitor order
- Customer tier at time of switch
- Platform destination

### Churn Rate Calculation

```
Churn Rate = (Critical + At-Risk Customers) / Total Active Customers × 100
```

Customers are considered "active" if they have 2+ orders and their last order was within 180 days.

## 🚀 Setup & Installation

### Prerequisites
- Google Cloud Platform account with Sheets API enabled
- Google Apps Script for interaction management
- GitHub Pages for hosting

### Configuration Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/Orbital-Kitchens/catering-crm.git
   ```

2. **Configure Google Sheets API**
   - Create API credentials in Google Cloud Console
   - Enable Google Sheets API
   - Update `SHEET_ID` in `js/config.js`

3. **Set up Customer Interactions Sheet**
   - Create new Google Sheet with "CustomerInteractions" tab
   - Columns: ID | Company Name | Interaction Type | Date | Notes | Next Followup Date | Sales Status | Created At
   - Update `INTERACTIONS_SHEET_ID` in `js/config.js`

4. **Deploy Google Apps Script**
   - Create new Apps Script project
   - Deploy as web app with execute permissions for "Anyone"
   - Update script URL in `js/interactions.js`

5. **Configure Maps API** (optional)
   - Enable Google Maps JavaScript API
   - Update API key in `index.html`

6. **Deploy to GitHub Pages**
   - Enable GitHub Pages in repository settings
   - Site will be available at `https://orbital-kitchens.github.io/catering-crm/`

## 💡 Usage

### Adding Customer Interactions
1. Click the 📝 button next to any company name
2. Fill out interaction details (type, date, notes, follow-up)
3. Set sales status (Prospect → Contacted → Converting → Converted)
4. Interactions are automatically saved to Google Sheets

### Viewing Analytics
1. Navigate to Analytics tab
2. Adjust date ranges using preset buttons or custom dates
3. View platform distribution and timeline charts
4. Expand top customers to see detailed order history

### Managing Sales Pipeline
1. Use Sales Pipeline tab for customer relationship management
2. Filter by tier, status, or follow-up requirements
3. Track overdue follow-ups and upcoming tasks
4. View detailed customer profiles with interaction history

### Monitoring Customer Churn
1. Navigate to Churn Analysis tab to view at-risk customers
2. Review top metrics: at-risk count, platform switchers, churn rate, silent customers
3. Expand risk segments (Critical/At-Risk/Watching) to see specific companies
4. Identify platform switchers who left Flex Catering for competitors
5. Filter churning customers by status, tier, or last contact date
6. Take proactive action by adding notes and scheduling follow-ups

## 🔒 Security Considerations

- API keys are restricted to specific domains
- Google Sheets should have appropriate sharing permissions
- Regular API key rotation recommended
- Customer data stored securely in Google ecosystem

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/enhancement`)
3. Follow modular structure when adding new functionality
4. Test thoroughly locally
5. Submit pull request with detailed description

## 📄 License

This project is proprietary software owned by Orbital Kitchens.