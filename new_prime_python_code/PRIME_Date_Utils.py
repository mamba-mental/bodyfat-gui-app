import datetime

def parse_date(date_str):
    """
    Parse a date string into a datetime.date object.
    Supports formats:
    - MMDDYY (e.g., "010123")
    - YYYY-MM-DD (e.g., "2023-01-01")
    - MM/DD/YYYY (e.g., "01/01/2023")
    - MM/DD/YY (e.g., "01/01/23")
    
    Args:
        date_str (str): The date string to parse.
        
    Returns:
        datetime.date: The parsed date object.
        
    Raises:
        ValueError: If the date string cannot be parsed.
    """
    if not isinstance(date_str, str):
        if isinstance(date_str, (datetime.date, datetime.datetime)):
            return date_str if isinstance(date_str, datetime.date) else date_str.date()
        raise ValueError(f"Input must be a string or date object, got {type(date_str)}")

    date_str = date_str.strip()
    
    # Try ISO format (YYYY-MM-DD)
    try:
        return datetime.datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        pass

    # Try MMDDYY
    if len(date_str) == 6 and date_str.isdigit():
        try:
            return datetime.datetime.strptime(date_str, "%m%d%y").date()
        except ValueError:
            pass

    # Try MM/DD/YYYY
    try:
        return datetime.datetime.strptime(date_str, "%m/%d/%Y").date()
    except ValueError:
        pass

    # Try MM/DD/YY
    try:
        return datetime.datetime.strptime(date_str, "%m/%d/%y").date()
    except ValueError:
        pass
        
    # Try MMDDYYYY
    if len(date_str) == 8 and date_str.isdigit():
        try:
            # Ambiguous: could be YYYYMMDD or MMDDYYYY. 
            # Given the project context (MMDDYY), MMDDYYYY is a plausible fallback,
            # but YYYYMMDD is standard for compact dates.
            # Let's try YYYYMMDD first as it's sortable.
            return datetime.datetime.strptime(date_str, "%Y%m%d").date()
        except ValueError:
            try:
                return datetime.datetime.strptime(date_str, "%m%d%Y").date()
            except ValueError:
                pass

    raise ValueError(f"Could not parse date string: {date_str}")

def format_date_iso(date_obj):
    """
    Format a date object as YYYY-MM-DD.
    """
    if isinstance(date_obj, str):
        date_obj = parse_date(date_obj)
    return date_obj.strftime("%Y-%m-%d")

def format_date_display(date_obj):
    """
    Format a date object for display (e.g., "Jan 01, 2023").
    """
    if isinstance(date_obj, str):
        date_obj = parse_date(date_obj)
    return date_obj.strftime("%b %d, %Y")

def format_date_legacy(date_obj):
    """
    Format a date object as MMDDYY (legacy format).
    """
    if isinstance(date_obj, str):
        date_obj = parse_date(date_obj)
    return date_obj.strftime("%m%d%y")
