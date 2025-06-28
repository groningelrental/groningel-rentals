"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import RegisterModal from "@/components/RegisterModal";
import {
  Search,
  Home as HomeIcon,
  Clock,
  MapPin,
  RefreshCw,
  Shield,
  Zap,
  ArrowRight,
  Star,
  Users,
  TrendingUp,
  ExternalLink,
  User,
  Bell
} from "lucide-react";
import Link from "next/link";
import { scrapeAllRealProperties } from "@/lib/real-property-scraper";
import { notificationService } from "@/lib/notification-service";
import type { Property } from "@/lib/api";

export default function HomePage() {
  const [propertyCount, setPropertyCount] = useState(0);
  const [newListingsToday, setNewListingsToday] = useState(0);
  const [sampleProperties, setSampleProperties] = useState<Property[]>([]);
  const [showLogin, setShowLogin] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const [agencyCounts, setAgencyCounts] = useState({
    gruno: 0,
    vanderMeulen: 0,
    rotsvast: 0,
    nova: 0,
    dcWonen: 0,
    wonen123: 0,
    mvgm: 0,
    kpMakelaars: 0,
    expatGroningen: 0
  });
  const [dailyUploads, setDailyUploads] = useState<Array<{ day: string; count: number; date: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [timeUntilNextScrape, setTimeUntilNextScrape] = useState(0);
  const { isAuthenticated, user, login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoginLoading(true);
    setLoginError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: loginForm.email, password: loginForm.password }),
      });

      if (response.ok) {
        const data = await response.json();
        // Update auth context
        await login(loginForm.email, loginForm.password);
        setShowLogin(false);
        setLoginForm({ email: '', password: '' });
        setLoginError('');
      } else {
        const data = await response.json();
        setLoginError(data.message || 'Login failed');
      }
    } catch (err) {
      setLoginError('An error occurred during login');
    } finally {
      setIsLoginLoading(false);
    }
  };

  const handleSwitchToRegister = () => {
    setShowLogin(false);
    setShowRegisterModal(true);
  };

  const handleCloseRegisterModal = () => {
    setShowRegisterModal(false);
  };

  const handleSwitchToLogin = () => {
    setShowRegisterModal(false);
    setShowLogin(true);
  };

  useEffect(() => {
    const loadRealProperties = async () => {
      try {
        setLoading(true);
        console.log('🌐 Fetching real properties from API...');

        // Call the real scraping API directly - no fallback to demo data
        const response = await fetch('/api/scrape-properties', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          console.error(`❌ Failed to fetch real properties: ${response.status}`);
          // Don't show any properties if scraping fails - only real data
          setPropertyCount(0);
          setNewListingsToday(0);
          setSampleProperties([]);
          setAgencyCounts({
            gruno: 0,
            vanderMeulen: 0,
            rotsvast: 0,
            nova: 0,
            dcWonen: 0,
            wonen123: 0,
            mvgm: 0,
            kpMakelaars: 0,
            expatGroningen: 0
          });
          return;
        }

        const data = await response.json();

        if (!data.properties || data.properties.length === 0) {
          console.warn('⚠️ No real properties found from scraping');
          setPropertyCount(0);
          setNewListingsToday(0);
          setSampleProperties([]);
          return;
        }

        // Convert scraped properties to our Property format
        const realProperties = data.properties.map((scraped: any) => ({
          id: scraped.id,
          title: scraped.title,
          price: scraped.price,
          location: scraped.location,
          size: scraped.size,
          rooms: scraped.rooms,
          source: scraped.agent || 'Unknown Agency',
          sourceUrl: scraped.sourceUrl,
          listedDays: scraped.daysAgo,
          daysAgo: scraped.daysAgo,
          listedDate: scraped.listedDate,
          image: scraped.image,
          images: scraped.images || [scraped.image],
          description: scraped.description,
          type: scraped.rooms === 1 ? 'Studio' : scraped.rooms <= 2 ? 'Apartment' : 'House',
          available: 'Available now',
          coordinates: {
            lat: 53.2194 + (Math.random() - 0.5) * 0.05,
            lng: 6.5665 + (Math.random() - 0.5) * 0.05
          }
        }));

        console.log(`✅ Found ${realProperties.length} real properties`);

        setPropertyCount(realProperties.length);
        setNewListingsToday(realProperties.filter((p: Property) => p.daysAgo === 0).length);

        // Calculate real agency counts for all 9 agencies
        const getAgencyName = (p: Property) => (p.source || '').toLowerCase();
        const grunoProperties = realProperties.filter((p: Property) => getAgencyName(p).includes('gruno'));
        const vanDerMeulenProperties = realProperties.filter((p: Property) => getAgencyName(p).includes('van der meulen') || getAgencyName(p).includes('vandermeulen'));
        const rotsVastProperties = realProperties.filter((p: Property) => getAgencyName(p).includes('rotsvast'));
        const novaProperties = realProperties.filter((p: Property) => getAgencyName(p).includes('nova'));
        const dcWonenProperties = realProperties.filter((p: Property) => getAgencyName(p).includes('dc wonen'));
        const wonen123Properties = realProperties.filter((p: Property) => getAgencyName(p).includes('123wonen'));
        const mvgmProperties = realProperties.filter((p: Property) => getAgencyName(p).includes('mvgm'));
        const kpMakelaarsProperties = realProperties.filter((p: Property) => getAgencyName(p).includes('k&p'));
        const expatGroningenProperties = realProperties.filter((p: Property) => getAgencyName(p).includes('expat'));

        setAgencyCounts({
          gruno: grunoProperties.length,
          vanderMeulen: vanDerMeulenProperties.length,
          rotsvast: rotsVastProperties.length,
          nova: novaProperties.length,
          dcWonen: dcWonenProperties.length,
          wonen123: wonen123Properties.length,
          mvgm: mvgmProperties.length,
          kpMakelaars: kpMakelaarsProperties.length,
          expatGroningen: expatGroningenProperties.length
        });

        // Calculate daily uploads for the chart (last 7 days)
        const today = new Date();
        const dailyData = [];
        for (let i = 6; i >= 0; i--) {
          const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
          const dateStr = date.toISOString().split('T')[0];
          const dayName = date.toLocaleDateString('en', { weekday: 'short' });

          const propertiesOnDay = realProperties.filter((p: any) => {
            if (p.listedDate) {
              return p.listedDate === dateStr;
            } else if (p.daysAgo !== undefined) {
              const propertyDate = new Date(today.getTime() - p.daysAgo * 24 * 60 * 60 * 1000);
              return propertyDate.toISOString().split('T')[0] === dateStr;
            }
            return false;
          });

          dailyData.push({
            day: dayName,
            count: propertiesOnDay.length,
            date: dateStr
          });
        }
        setDailyUploads(dailyData);

        // Show limited properties for non-logged users, all for logged users
        const maxProperties = isAuthenticated ? realProperties.length : 5;
        setSampleProperties(realProperties.slice(0, maxProperties));

      } catch (error) {
        console.error('❌ Error loading real properties:', error);
        // On error, show empty state - no demo data
        setPropertyCount(0);
        setNewListingsToday(0);
        setSampleProperties([]);
      } finally {
        setLoading(false);
      }
    };

    // Load real properties immediately when page loads
    loadRealProperties();

    // Set up auto-refresh every 10 minutes to get fresh data
    const interval = setInterval(loadRealProperties, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [isAuthenticated]); // Re-run when auth status changes

  // Timer for auto re-scraping every 10 minutes (600 seconds)
  useEffect(() => {
    const SCRAPE_INTERVAL = 10 * 60; // 10 minutes in seconds
    setTimeUntilNextScrape(SCRAPE_INTERVAL);

    const countdown = setInterval(() => {
      setTimeUntilNextScrape(prev => {
        if (prev <= 1) {
          // Time to re-scrape
          console.log('🔄 Auto re-scraping properties...');
          const loadStats = async () => {
            try {
              setLoading(true);
              const properties = await scrapeAllRealProperties();
              setPropertyCount(properties.length);
              setNewListingsToday(properties.filter(p => (p.daysAgo || p.listedDays) === 0).length);

              // Calculate real agency counts for all 9 agencies
              const getAgencyName = (p: any) => (p.agent || p.source || '').toLowerCase();
              const grunoProperties = properties.filter(p => getAgencyName(p).includes('gruno'));
              const vanDerMeulenProperties = properties.filter(p => getAgencyName(p).includes('van der meulen') || getAgencyName(p).includes('vandermeulen'));
              const rotsVastProperties = properties.filter(p => getAgencyName(p).includes('rotsvast'));
              const novaProperties = properties.filter(p => getAgencyName(p).includes('nova'));
              const dcWonenProperties = properties.filter(p => getAgencyName(p).includes('dc wonen'));
              const wonen123Properties = properties.filter(p => getAgencyName(p).includes('123wonen'));
              const mvgmProperties = properties.filter(p => getAgencyName(p).includes('mvgm'));
              const kpMakelaarsProperties = properties.filter(p => getAgencyName(p).includes('k&p'));
              const expatGroningenProperties = properties.filter(p => getAgencyName(p).includes('expat'));

              setAgencyCounts({
                gruno: grunoProperties.length,
                vanderMeulen: vanDerMeulenProperties.length,
                rotsvast: rotsVastProperties.length,
                nova: novaProperties.length,
                dcWonen: dcWonenProperties.length,
                wonen123: wonen123Properties.length,
                mvgm: mvgmProperties.length,
                kpMakelaars: kpMakelaarsProperties.length,
                expatGroningen: expatGroningenProperties.length
              });

              // Show limited properties for non-logged users, all for logged users
              const maxProperties = isAuthenticated ? properties.length : 5;
              const otherProperties = properties.filter(p => !getAgencyName(p).includes('gruno'));
              const sampleProps = [...grunoProperties.slice(0, Math.min(8, maxProperties)), ...otherProperties.slice(0, Math.max(0, maxProperties - grunoProperties.length))];
              setSampleProperties(sampleProps.slice(0, maxProperties));
            } catch (error) {
              console.error('Error auto re-scraping:', error);
            } finally {
              setLoading(false);
            }
          };
          loadStats();
          return SCRAPE_INTERVAL; // Reset timer
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdown);
  }, [isAuthenticated]); // Re-run when auth status changes

  const features = [
    {
      icon: RefreshCw,
      title: "Real-Time Updates",
      description: "Live property data updated in real-time from agency websites"
    },
    {
      icon: Shield,
      title: "Verified Listings",
      description: "Direct access to 9 real estate agencies: Gruno, Van der Meulen, Rotsvast, Nova, DC Wonen, 123Wonen, MVGM, K&P Makelaars & Expat Groningen"
    },
    {
      icon: Zap,
      title: "Lightning Fast",
      description: "Click any property to instantly view full details and photos on the agency site"
    },
    {
      icon: MapPin,
      title: "Complete Coverage",
      description: "Every neighborhood in Groningen, from Centrum to Zernike"
    }
  ];

  const sources = [
    { name: "Gruno Verhuur", count: agencyCounts.gruno, color: "bg-blue-500" },
    { name: "Van der Meulen", count: agencyCounts.vanderMeulen, color: "bg-green-500" },
    { name: "Rotsvast", count: agencyCounts.rotsvast, color: "bg-purple-500" },
    { name: "Nova Vastgoed", count: agencyCounts.nova, color: "bg-orange-500" },
    { name: "DC Wonen", count: agencyCounts.dcWonen, color: "bg-red-500" },
    { name: "123Wonen", count: agencyCounts.wonen123, color: "bg-yellow-500" },
    { name: "MVGM Wonen", count: agencyCounts.mvgm, color: "bg-indigo-500" },
    { name: "K&P Makelaars", count: agencyCounts.kpMakelaars, color: "bg-gray-500" },
    { name: "Expat Groningen", count: agencyCounts.expatGroningen, color: "bg-teal-500" },
    { name: "Total Properties", count: propertyCount, color: "bg-cyan-500" },
    { name: "New Today", count: newListingsToday, color: "bg-pink-500" }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-white/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <HomeIcon className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">GroningenRentals</h1>
                <p className="text-sm text-muted-foreground">All rentals, one platform</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {isAuthenticated && (
                <div className="flex items-center space-x-3">
                  <Badge variant="secondary" className="px-3 py-1">
                    <Star className="h-3 w-3 mr-1" />
                    {user?.name}
                  </Badge>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/account">
                      <User className="h-4 w-4 mr-2" />
                      Account
                    </Link>
                  </Button>
                </div>
              )}
              {!isAuthenticated && (
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" onClick={() => setShowLogin(true)}>
                    <User className="h-4 w-4 mr-2" />
                    Login
                  </Button>
                  <Button size="sm" onClick={() => setShowRegisterModal(true)}>
                    Sign Up
                  </Button>
                </div>
              )}
              <Button variant="outline" asChild>
                <Link href="/notifications">
                  <Bell className="h-4 w-4 mr-2" />
                  Email Alerts
                </Link>
              </Button>
              <Button asChild>
                <Link href="/properties">
                  <Search className="h-4 w-4 mr-2" />
                  Browse Properties
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 bg-gradient-to-b from-primary/5 via-primary/2 to-background">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-4xl mx-auto">
            <Badge variant="secondary" className="mb-4">
              {loading
                ? "🔍 Live Scraping In Progress • Real Data Only"
                : `⚡ Real-Time Data • Auto-Scraping Every 10min • Next: ${Math.floor(timeUntilNextScrape / 60)}:${(timeUntilNextScrape % 60).toString().padStart(2, '0')}`
              }
            </Badge>

            <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Find Your Perfect Home in Groningen
            </h1>

            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Live-scraped properties from 9 real Groningen agencies. Fresh data every 10 minutes.
              Click any property to view full details on the agency's official website.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              {isAuthenticated ? (
                <>
                  <Button size="lg" className="text-lg px-8" asChild>
                    <Link href="/properties">
                      <Search className="h-5 w-5 mr-2" />
                      Search Properties
                      <ArrowRight className="h-5 w-5 ml-2" />
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" className="text-lg px-8" asChild>
                    <Link href="/sources">
                      View Agencies
                    </Link>
                  </Button>
                </>
              ) : (
                <>
                  <Button size="lg" className="text-lg px-8" asChild>
                    <Link href="/properties">
                      <Search className="h-5 w-5 mr-2" />
                      Browse Properties
                      <ArrowRight className="h-5 w-5 ml-2" />
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" className="text-lg px-8" asChild>
                    <Link href="/sources">
                      View Agencies
                    </Link>
                  </Button>
                </>
              )}
            </div>

            {/* Live Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-2xl mx-auto">
              <Card className="border-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-2xl font-bold text-primary">
                    {loading ? "..." : propertyCount}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Active Properties</p>
                </CardContent>
              </Card>

              <Card className="border-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-2xl font-bold text-green-600">
                    {loading ? "..." : newListingsToday}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">New Today</p>
                </CardContent>
              </Card>

              <Card className="border-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-2xl font-bold text-blue-600">9</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Real Agencies</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Loading/Scraping Section */}
      {loading && (
        <section className="py-16 bg-muted/20">
          <div className="container mx-auto px-4">
            <div className="text-center">
              <div className="flex items-center justify-center mb-6">
                <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mr-3" />
                <h2 className="text-3xl font-bold">Live Scraping in Progress</h2>
              </div>
              <p className="text-muted-foreground max-w-2xl mx-auto mb-8">
                🔍 Currently scanning 9 real estate agencies for the latest properties...
                <br />
                This may take up to 10 minutes to get fresh, real-time data.
              </p>
              <div className="bg-white/50 backdrop-blur-sm rounded-lg border p-6 max-w-md mx-auto">
                <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
                  <Zap className="h-4 w-4 text-yellow-500" />
                  <span>Scraping Gruno, Rotsvast, Van der Meulen & 6 more agencies</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* No Properties Message */}
      {!loading && sampleProperties.length === 0 && (
        <section className="py-16 bg-muted/20">
          <div className="container mx-auto px-4">
            <div className="text-center">
              <h2 className="text-3xl font-bold mb-4">No Properties Found</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto mb-6">
                Real-time scraping didn't find any properties. This could mean:
              </p>
              <div className="bg-white/50 backdrop-blur-sm rounded-lg border p-6 max-w-md mx-auto">
                <ul className="text-sm text-gray-600 space-y-2">
                  <li>• All agencies are currently updating their listings</li>
                  <li>• Temporary network issues with agency websites</li>
                  <li>• Low inventory period (try again in a few hours)</li>
                </ul>
              </div>
              <Button
                onClick={() => window.location.reload()}
                className="mt-4"
                variant="outline"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Scraping Again
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Sample Properties Section */}
      {!loading && sampleProperties.length > 0 && (
        <section className="py-16 bg-muted/20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Live Properties from Real Agencies</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                {isAuthenticated
                  ? "Fresh listings scraped directly from Groningen real estate agency websites"
                  : "Sample of our live property data - login to see all properties"}
              </p>
              {!isAuthenticated && (
                <p className="text-sm text-blue-600 mt-2 font-medium">
                  🔒 Login to view all {propertyCount} available properties
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sampleProperties.map((property) => (
                <Card
                  key={property.id}
                  className="group cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-[1.02] border border-gray-200/50 bg-white/80 backdrop-blur-sm hover:bg-white hover:border-blue-200"
                  onClick={() => window.open(property.sourceUrl, '_blank')}
                >
                  <CardContent className="p-6">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <Badge
                        variant="outline"
                        className="bg-blue-50 text-blue-700 border-blue-200 text-xs font-medium"
                      >
                        {property.source}
                      </Badge>
                      {(property.daysAgo || property.listedDays) === 0 && (
                        <Badge className="bg-emerald-500 text-white text-xs font-medium">
                          New!
                        </Badge>
                      )}
                    </div>

                    {/* Property Title */}
                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors duration-200 mb-2 line-clamp-2">
                      {property.title}
                    </h3>

                    {/* Location */}
                    <div className="flex items-center text-gray-600 mb-4">
                      <MapPin className="h-4 w-4 mr-1" />
                      <span className="text-sm font-medium">{property.location}</span>
                    </div>

                    {/* Price Highlight */}
                    <div className="text-center py-3 mb-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
                      <div className="text-2xl font-bold text-gray-900">
                        €{property.price.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-600 font-medium">per month</div>
                    </div>

                    {/* Key Details */}
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="text-center p-2 bg-gray-50 rounded-md">
                        <div className="text-lg font-bold text-gray-900">{property.size}</div>
                        <div className="text-xs text-gray-600">Size</div>
                      </div>
                      <div className="text-center p-2 bg-gray-50 rounded-md">
                        <div className="text-lg font-bold text-gray-900">{property.rooms}</div>
                        <div className="text-xs text-gray-600">Rooms</div>
                      </div>
                      <div className="text-center p-2 bg-gray-50 rounded-md">
                        <div className="text-lg font-bold text-gray-900">{property.type}</div>
                        <div className="text-xs text-gray-600">Type</div>
                      </div>
                    </div>

                    {/* Status & Action */}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <span className="text-sm text-emerald-600 font-medium">
                        {property.available}
                      </span>
                      <div className="flex items-center text-blue-600 group-hover:text-blue-700 transition-colors">
                        <span className="text-sm font-medium mr-2">View Details</span>
                        <ExternalLink className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="text-center mt-8">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700" asChild>
                <Link href="/properties">
                  <Search className="h-4 w-4 mr-2" />
                  {isAuthenticated ? `View All ${propertyCount} Properties` : `Login to View All ${propertyCount} Properties`}
                </Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Data Insights Section */}
      <section className="py-16 bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Real-Time Market Intelligence</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Live data from 9 real estate agencies in Groningen updated every 10 minutes automatically
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            {/* Activity Chart */}
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <h3 className="text-xl font-semibold mb-4 flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-blue-600" />
                Property Uploads by Day (Last 7 Days)
              </h3>

              {/* Chart Area */}
              <div className="relative h-64 mb-4">
                <div className="absolute inset-0 flex items-end justify-between px-2">
                  {dailyUploads.map((day, index) => {
                    const maxCount = Math.max(...dailyUploads.map(d => d.count), 1);
                    const heightPercent = Math.max((day.count / maxCount) * 100, 5);

                    return (
                      <div key={index} className="flex flex-col items-center" style={{ width: 'calc(100% / 7)' }}>
                        <div className="relative w-12 bg-gray-100 rounded-t-md overflow-hidden" style={{ height: '200px' }}>
                          <div
                            className="absolute bottom-0 w-full bg-gradient-to-t from-blue-500 to-blue-400 transition-all duration-1000 ease-out rounded-t-md"
                            style={{ height: `${heightPercent}%` }}
                          />
                          <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-bold text-gray-700">
                            {loading ? '...' : day.count}
                          </div>
                        </div>
                        <span className="text-xs font-medium mt-2 text-center leading-tight">{day.day}</span>
                        <span className="text-xs text-gray-500">{new Date(day.date).getDate()}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>Daily Property Uploads</span>
                <div className="flex items-center text-xs">
                  <div className="w-2 h-2 bg-blue-500 rounded mr-1" />
                  <span>New Properties</span>
                </div>
              </div>
            </div>

            {/* Insights Cards */}
            <div className="space-y-6">
              <Card className="border-l-4 border-l-green-500">
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Clock className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-lg mb-2">Real-Time Scraping</h4>
                      <p className="text-gray-600 mb-3">
                        Our system checks all <strong>9 agencies every 10 minutes</strong> for new properties. Data is fetched directly from agency websites.
                      </p>
                      <div className="text-sm text-green-600 font-medium">
                        ⚡ Live data from Gruno, Van der Meulen, Rotsvast, Nova, DC Wonen, 123Wonen, MVGM, K&P & Expat Groningen
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-blue-500">
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <TrendingUp className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-lg mb-2">Direct Agency Links</h4>
                      <p className="text-gray-600 mb-3">
                        Every property card links <strong>directly to the agency website</strong>. No middleman - click and view full details instantly.
                      </p>
                      <div className="text-sm text-blue-600 font-medium">
                        🔗 Direct links to rotsvast.nl, grunoverhuur.nl, etc.
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-purple-500">
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Star className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-lg mb-2">Accurate Listing Dates</h4>
                      <p className="text-gray-600 mb-3">
                        We extract real listing dates from each agency website, showing you exactly when properties were posted.
                      </p>
                      <div className="text-sm text-purple-600 font-medium">
                        📅 Real dates: "Listed 3 days ago", not generic timestamps
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Bottom Stats */}
          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-2xl font-bold text-blue-600">{propertyCount || '40+'}</div>
              <div className="text-sm text-gray-600">Live Properties</div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-2xl font-bold text-green-600">10min</div>
              <div className="text-sm text-gray-600">Auto Updates</div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-2xl font-bold text-purple-600">9</div>
              <div className="text-sm text-gray-600">Real Agencies</div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-2xl font-bold text-orange-600">100%</div>
              <div className="text-sm text-gray-600">Direct Links</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16" id="how-it-works">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Why Choose GroningenRentals?</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Direct connection to top real estate agencies - no middleman, no delays, instant access to official listings
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="text-center hover:shadow-lg transition-shadow">
                <CardHeader>
                  <feature.icon className="h-12 w-12 text-primary mx-auto mb-4" />
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Sources Section */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">We Search Everything</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Connected directly to top real estate agencies in Groningen
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {sources.map((source, index) => (
              <Card key={index} className="text-center hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className={`w-3 h-3 rounded-full ${source.color} mx-auto mb-2`} />
                  <CardTitle className="text-sm font-medium">{source.name}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-lg font-bold text-primary">{source.count}</p>
                  <p className="text-xs text-muted-foreground">properties</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <Card className="bg-gradient-to-r from-primary to-primary/80 text-white text-center p-8">
            <CardHeader>
              <CardTitle className="text-3xl font-bold mb-4">Ready to Find Your Home?</CardTitle>
              <p className="text-lg opacity-90 max-w-2xl mx-auto">
                Browse properties from Groningen's top real estate agencies with instant access to official listings
              </p>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4 justify-center mt-6">
                {isAuthenticated ? (
                  <>
                    <Button size="lg" variant="secondary" className="text-lg px-8" asChild>
                      <Link href="/properties">
                        <Search className="h-5 w-5 mr-2" />
                        Search Properties
                      </Link>
                    </Button>
                    <Button size="lg" variant="outline" className="text-lg px-8 border-white text-white hover:bg-white hover:text-primary" asChild>
                      <Link href="/properties">
                        Find Your Home
                      </Link>
                    </Button>
                  </>
                ) : (
                  <>
                    <Button size="lg" variant="secondary" className="text-lg px-8" asChild>
                      <Link href="/properties">
                        <Search className="h-5 w-5 mr-2" />
                        Browse Properties
                      </Link>
                    </Button>
                    <Button size="lg" variant="outline" className="text-lg px-8 border-white text-white hover:bg-white hover:text-primary" asChild>
                      <Link href="/sources">
                        View Agencies
                      </Link>
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted/30 py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <HomeIcon className="h-6 w-6 text-primary" />
              <span className="font-semibold">GroningenRentals</span>
            </div>

            <div className="flex items-center space-x-6 text-sm text-muted-foreground">
              <Link href="/sources" className="hover:text-primary">Our Agencies</Link>
              <Link href="/properties" className="hover:text-primary">Browse Properties</Link>
              <span>© 2025 GroningenRentals</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Login Dialog */}
      <Dialog open={showLogin} onOpenChange={setShowLogin}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Login to GroningenRentals</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={loginForm.email}
                onChange={(e) => setLoginForm(prev => ({ ...prev, email: e.target.value }))}
                required
                disabled={isLoginLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter secure password"
                value={loginForm.password}
                onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                required
                disabled={isLoginLoading}
              />
            </div>
            {loginError && (
              <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
                {loginError}
              </div>
            )}
            <div className="space-y-2">
              <Button type="submit" className="w-full" disabled={isLoginLoading}>
                {isLoginLoading ? 'Logging in...' : 'Login'}
              </Button>
              <div className="text-center text-sm text-gray-600">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={handleSwitchToRegister}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                  disabled={isLoginLoading}
                >
                  Create one
                </button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Register Modal */}
      <RegisterModal
        isOpen={showRegisterModal}
        onClose={handleCloseRegisterModal}
        onSwitchToLogin={handleSwitchToLogin}
      />
    </div>
  );
}
