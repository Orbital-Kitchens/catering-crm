// Configuration constants
const SHEET_ID = '1dms10f1dUDnzVXwLzTYXRzgDXmGLeAq7VmYIUy-jE8M';
const INTERACTIONS_SHEET_ID = '1suveOAd-Bh788IwBaPcGQSxQUOzSWtjsvyQDMuLCW2w';
const AUTO_API_KEY = 'AIzaSyBXczOmluY96FcE0PXBndJinIbLvXk91RY';
const AUTO_ORBITAL_TAB = 'Orbital';

// Global state variables
let allOrders = [];
let customerInteractions = {};
let customerTiers = {};
let connectionConfig = {};
let charts = {};
let map;
let markers = [];
let geocodeCache = {};

// Initialize connection configuration
connectionConfig = {
    method: 'apiKey',
    apiKey: AUTO_API_KEY,
    orbitalTab: AUTO_ORBITAL_TAB
};