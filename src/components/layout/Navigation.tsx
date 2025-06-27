
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, User, Building2, FileText, MessageSquare, Search, Files } from "lucide-react";
import { useSafeAuth } from "@/contexts/AuthContext";

export const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const navigate = useNavigate();

  // Use safe auth hook that provides defaults when no provider exists
  const { user, loading, signOut } = useSafeAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.warn('Sign out failed:', error);
      // Fallback: just navigate to home
      navigate('/');
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/legal-qa?q=${encodeURIComponent(searchQuery)}`);
      setSearchQuery("");
      setShowSearch(false);
    }
  };

  const navItems = [
    { name: "Home", href: "/" },
    { name: "Free Analysis", href: "/analyze", icon: FileText, highlight: true },
    { name: "Templates", href: "/templates", icon: Files },
    { name: "Law Firms", href: "/law-firms", icon: Building2 },
    { name: "Documents", href: "/documents", icon: FileText },
    { name: "Legal Q&A", href: "/legal-qa", icon: MessageSquare },
    { name: "Pricing", href: "/pricing" },
  ];

  return (
    <nav className="bg-white shadow-lg fixed w-full top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link to="/" className="text-2xl font-bold text-blue-900 hover:text-blue-800 transition-colors">
              LegalHelpSG
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-4 flex-1">
            <div className="flex items-baseline space-x-3 ml-8">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`px-2 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-1 ${
                    item.highlight
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "text-gray-700 hover:text-blue-600"
                  }`}
                >
                  {item.icon && <item.icon className="h-4 w-4" />}
                  <span>{item.name}</span>
                </Link>
              ))}
            </div>

            {/* Search Bar - Only on larger screens */}
            <div className="relative hidden xl:block">
              {showSearch ? (
                <form onSubmit={handleSearch} className="flex items-center">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      type="text"
                      placeholder="Search legal topics..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 pr-4 py-2 w-48 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      autoFocus
                      onBlur={() => {
                        if (!searchQuery.trim()) {
                          setShowSearch(false);
                        }
                      }}
                    />
                  </div>
                  <Button type="submit" size="sm" className="ml-2 bg-blue-600 hover:bg-blue-700">
                    Search
                  </Button>
                </form>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSearch(true)}
                  className="flex items-center space-x-2"
                >
                  <Search className="h-4 w-4" />
                  <span>Search</span>
                </Button>
              )}
            </div>
          </div>

          {/* CTA Buttons - Temporarily simplified */}
          <div className="flex items-center space-x-2 flex-shrink-0 ml-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/auth/login')}
              className="px-4 py-2 text-sm font-medium whitespace-nowrap border-gray-300 hover:border-blue-600 hover:text-blue-600"
            >
              Sign In
            </Button>
            <Button
              size="sm"
              onClick={() => navigate('/auth/register')}
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 text-sm font-medium whitespace-nowrap"
            >
              Get Started
            </Button>
          </div>

          {/* Mobile menu button */}
          <div className="lg:hidden ml-2">
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="p-2">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                <div className="flex flex-col space-y-4 mt-8">
                  {/* Mobile Search */}
                  <form onSubmit={handleSearch} className="mb-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        type="text"
                        placeholder="Search legal topics..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 pr-4 py-2 w-full border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                    <Button type="submit" className="w-full mt-2 bg-blue-600 hover:bg-blue-700">
                      Search
                    </Button>
                  </form>

                  {navItems.map((item) => (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`px-3 py-2 rounded-md text-lg font-medium transition-colors flex items-center space-x-2 ${
                        item.highlight
                          ? "bg-blue-600 text-white hover:bg-blue-700"
                          : "text-gray-700 hover:text-blue-600"
                      }`}
                      onClick={() => setIsOpen(false)}
                    >
                      {item.icon && <item.icon className="h-5 w-5" />}
                      <span>{item.name}</span>
                    </Link>
                  ))}
                  <div className="border-t pt-4 mt-4">
                    {user ? (
                      <Button
                        onClick={() => {
                          navigate('/dashboard');
                          setIsOpen(false);
                        }}
                        className="w-full mt-4 bg-blue-600 hover:bg-blue-700"
                      >
                        <User className="h-4 w-4 mr-2" />
                        Dashboard
                      </Button>
                    ) : (
                      <div className="space-y-2 mt-4">
                        <Button
                          variant="outline"
                          onClick={() => {
                            navigate('/auth/login');
                            setIsOpen(false);
                          }}
                          className="w-full"
                          disabled={loading}
                        >
                          {loading ? 'Loading...' : 'Sign In'}
                        </Button>
                        <Button
                          onClick={() => {
                            navigate('/auth/register');
                            setIsOpen(false);
                          }}
                          className="w-full bg-blue-600 hover:bg-blue-700"
                          disabled={loading}
                        >
                          {loading ? 'Loading...' : 'Get Started'}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
};
