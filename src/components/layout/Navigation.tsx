
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, Phone, Mail, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  const navItems = [
    { name: "Home", href: "/" },
    { name: "Pricing", href: "/pricing" },
    { name: "Practice Areas", href: "#practice-areas" },
    { name: "About", href: "#about" },
    { name: "Contact", href: "#contact" },
  ];

  return (
    <nav className="bg-white shadow-lg fixed w-full top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link to="/" className="text-2xl font-bold text-blue-900 hover:text-blue-800 transition-colors">
              LawMattersSG
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              {navItems.map((item) => (
                item.href.startsWith('#') ? (
                  <a
                    key={item.name}
                    href={item.href}
                    className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    {item.name}
                  </a>
                ) : (
                  <Link
                    key={item.name}
                    to={item.href}
                    className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    {item.name}
                  </Link>
                )
              ))}
            </div>
          </div>

          {/* Contact Info & CTA */}
          <div className="hidden lg:flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Phone className="h-4 w-4" />
              <span>+65 6123 4567</span>
            </div>
            {user ? (
              <Button
                onClick={() => navigate('/dashboard')}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <User className="h-4 w-4 mr-2" />
                Dashboard
              </Button>
            ) : (
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  onClick={() => navigate('/auth/login')}
                >
                  Sign In
                </Button>
                <Button
                  onClick={() => navigate('/auth/register')}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Get Started
                </Button>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                <div className="flex flex-col space-y-4 mt-8">
                  {navItems.map((item) => (
                    item.href.startsWith('#') ? (
                      <a
                        key={item.name}
                        href={item.href}
                        className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-lg font-medium transition-colors"
                        onClick={() => setIsOpen(false)}
                      >
                        {item.name}
                      </a>
                    ) : (
                      <Link
                        key={item.name}
                        to={item.href}
                        className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-lg font-medium transition-colors"
                        onClick={() => setIsOpen(false)}
                      >
                        {item.name}
                      </Link>
                    )
                  ))}
                  <div className="border-t pt-4 mt-4">
                    <div className="flex items-center space-x-2 text-gray-600 px-3 py-2">
                      <Phone className="h-4 w-4" />
                      <span>+65 6123 4567</span>
                    </div>
                    <div className="flex items-center space-x-2 text-gray-600 px-3 py-2">
                      <Mail className="h-4 w-4" />
                      <span>info@lawmatters.sg</span>
                    </div>
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
                        >
                          Sign In
                        </Button>
                        <Button
                          onClick={() => {
                            navigate('/auth/register');
                            setIsOpen(false);
                          }}
                          className="w-full bg-blue-600 hover:bg-blue-700"
                        >
                          Get Started
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
